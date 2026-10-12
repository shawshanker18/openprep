// CBSE chapter-aware course assignment, server side. The decision is made by engine/assignment.ts;
// this module loads the data, stores the outcome, and keeps history. It never writes lesson_progress: reassigning a
// student changes which course version they are on, not what they have already finished.
import "server-only";
import { asc, eq, gt, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { assignmentHistory, assignmentRules, courseVersions, profiles, studentCourseAssignments } from "@/db/schema";
import { CBSE_CHAPTERS } from "@/content/cbse-chapters";
import {
  evaluateAssignment, type AssignmentRule, type ChapterInfo, type CourseVersionInfo, type EvaluationResult, type Expr,
} from "@/engine/assignment";

/** Upper bound for one admin-triggered recalculation. Larger runs are split across requests (see recalculateAll). */
export const MAX_RECALC_STUDENTS = 20_000;
const BATCH = 500;

/** Every CBSE chapter is active today. Deactivating one is a content change, so rules naming it are reported, not guessed. */
export const chapterCatalog = (): ChapterInfo[] => CBSE_CHAPTERS.map((c) => ({ id: c.id, grade: c.grade, active: true }));

type RuleRow = typeof assignmentRules.$inferSelect;
type VersionRow = typeof courseVersions.$inferSelect;

export const toRule = (r: RuleRow): AssignmentRule => ({
  id: r.id, name: r.name, active: r.status === "live", priority: r.priority, targetVersionId: r.targetVersionId, when: r.condition,
  effectiveFrom: r.effectiveFrom?.toISOString() ?? null, effectiveUntil: r.effectiveUntil?.toISOString() ?? null,
});
export const toVersion = (v: VersionRow): CourseVersionInfo => ({ id: v.id, published: v.status === "published" });

export async function loadCatalogData(client: Pick<typeof db, "select"> = db) {
  const [ruleRows, versionRows] = await Promise.all([
    client.select().from(assignmentRules).orderBy(asc(assignmentRules.id)),
    client.select().from(courseVersions).orderBy(asc(courseVersions.id)),
  ]);
  const versions = versionRows.map(toVersion);
  const fallback = versionRows.find((v) => v.isFallback && v.status === "published")?.id ?? null;
  return { rules: ruleRows.map(toRule), versions, fallbackVersionId: fallback, versionRows, ruleRows };
}

/** Pure decision for one student's chapters against loaded data. Used by evaluation, recalculation and previews alike. */
export function decide(data: Awaited<ReturnType<typeof loadCatalogData>>, completed: readonly string[], now: Date, rules = data.rules): EvaluationResult {
  return evaluateAssignment({ completed, chapters: chapterCatalog(), versions: data.versions, rules, fallbackVersionId: data.fallbackVersionId, now });
}

const outcomeVersion = (r: EvaluationResult) => (r.outcome === "unresolved" ? null : r.versionId);
const outcomeRule = (r: EvaluationResult) => (r.outcome === "assigned" ? r.ruleId : null);

/**
 * Store a student's outcome. History gets a row only when the decision changed, so it reads as a list of decisions
 * rather than one row per re-check. Returns whether anything changed.
 */
export async function persistOutcome(tx: Tx, userId: string, result: EvaluationResult, now: Date): Promise<boolean> {
  const [current] = await tx.select().from(studentCourseAssignments).where(eq(studentCourseAssignments.userId, userId)).for("update");
  const version = outcomeVersion(result), rule = outcomeRule(result);
  const same = !!current && current.versionId === version && current.ruleId === rule && current.outcome === result.outcome;
  if (same) return false;

  await tx.insert(assignmentHistory).values({
    userId, versionId: version, ruleId: rule, outcome: result.outcome, reason: result.reason,
    detail: {
      issues: result.issues,
      ...(result.outcome === "assigned" ? { matchedRuleIds: result.matchedRuleIds, shadowedRuleIds: result.shadowedRuleIds } : {}),
    },
    evaluatedAt: now,
  });
  if (version) {
    await tx.insert(studentCourseAssignments).values({ userId, versionId: version, ruleId: rule, outcome: result.outcome, assignedAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: studentCourseAssignments.userId, set: { versionId: version, ruleId: rule, outcome: result.outcome, assignedAt: now, updatedAt: now } });
  } else if (current) {
    await tx.delete(studentCourseAssignments).where(eq(studentCourseAssignments.userId, userId));
  }
  return true;
}

/** Re-evaluate one student from their current chapters and store the result. Safe to call repeatedly. */
export async function evaluateStudent(userId: string, now = new Date()): Promise<{ result: EvaluationResult; changed: boolean }> {
  const data = await loadCatalogData();
  const [profile] = await db.select({ chaptersDone: profiles.chaptersDone }).from(profiles).where(eq(profiles.id, userId));
  if (!profile) throw new Error("no profile for course assignment");
  const result = decide(data, profile.chaptersDone, now);
  const changed = await db.transaction((tx) => persistOutcome(tx as unknown as Tx, userId, result, now));
  return { result, changed };
}

/** Walk every student in id order, in batches, so memory stays bounded however many students there are. */
async function* students(client: Pick<typeof db, "select">, limit: number) {
  let after = "00000000-0000-0000-0000-000000000000", seen = 0;
  while (seen < limit) {
    const rows = await client.select({ id: profiles.id, chaptersDone: profiles.chaptersDone }).from(profiles)
      .where(gt(profiles.id, after)).orderBy(asc(profiles.id)).limit(Math.min(BATCH, limit - seen));
    if (!rows.length) return;
    for (const r of rows) yield r;
    seen += rows.length;
    after = rows[rows.length - 1]!.id;
  }
}

/**
 * Re-evaluate students after a rule or version changes (the publish step). Returns counts and whether the run hit the
 * cap, so an admin knows to run it again rather than assuming everyone was covered.
 */
export async function recalculateAll(now = new Date(), limit = MAX_RECALC_STUDENTS) {
  const data = await loadCatalogData();
  let evaluated = 0, changed = 0;
  for await (const s of students(db, limit)) {
    const result = decide(data, s.chaptersDone, now);
    if (await db.transaction((tx) => persistOutcome(tx as unknown as Tx, s.id, result, now))) changed++;
    evaluated++;
  }
  return { evaluated, changed, capped: evaluated >= limit };
}

/**
 * What would change if these rules were live: counts only, never student records. `proposed` is the complete rule set
 * as it would be after the change. Read-only.
 */
export async function previewImpact(proposed: AssignmentRule[], data?: Awaited<ReturnType<typeof loadCatalogData>>, now = new Date(), limit = MAX_RECALC_STUDENTS) {
  const base = data ?? (await loadCatalogData());
  const current = new Map((await db.select({ userId: studentCourseAssignments.userId, versionId: studentCourseAssignments.versionId })
    .from(studentCourseAssignments)).map((r) => [r.userId, r.versionId]));
  const out = { students: 0, toNewVersion: 0, newlyAssigned: 0, becomesUnassigned: 0, unchanged: 0, capped: false };
  for await (const s of students(db, limit)) {
    out.students++;
    const next = outcomeVersion(decide(base, s.chaptersDone, now, proposed));
    const before = current.get(s.id) ?? null;
    if (next === before) out.unchanged++;
    else if (before === null) out.newlyAssigned++;
    else if (next === null) out.becomesUnassigned++;
    else out.toNewVersion++;
  }
  out.capped = out.students >= limit;
  return out;
}

/** The student's current course version and why, for the Start page. Null when nothing is assigned. */
export async function studentAssignment(userId: string) {
  const [row] = await db.select({ versionId: studentCourseAssignments.versionId, outcome: studentCourseAssignments.outcome, name: courseVersions.name, description: courseVersions.description, assignedAt: studentCourseAssignments.assignedAt })
    .from(studentCourseAssignments).innerJoin(courseVersions, eq(courseVersions.id, studentCourseAssignments.versionId))
    .where(eq(studentCourseAssignments.userId, userId));
  if (!row) return null;
  const [last] = await db.select({ reason: assignmentHistory.reason }).from(assignmentHistory)
    .where(eq(assignmentHistory.userId, userId)).orderBy(sql`${assignmentHistory.evaluatedAt} desc`).limit(1);
  return { ...row, reason: last?.reason ?? null };
}

/** Rule condition, in plain form, for the rule builder and previews. */
export const conditionChapters = (expr: Expr): string[] => ("chapter" in expr ? [expr.chapter] : ("all" in expr ? expr.all : expr.any).flatMap(conditionChapters));

/** Refresh one student's course after their chapters change. A failure is logged, never shown: saving the profile matters more. */
export async function refreshCourseAssignment(userId: string) {
  try {
    await evaluateStudent(userId);
  } catch (err) {
    console.error("course assignment refresh failed", err);
  }
}
