// CBSE chapter-aware course assignment, server side. The decision is made by engine/assignment.ts;
// this module loads the data, stores the outcome, and keeps history. It never writes lesson_progress: reassigning a
// student changes which course version they are on, not what they have already finished.
import "server-only";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { assignmentHistory, assignmentRules, courses, courseVersions, profiles, studentCourseAssignments, userGroupMembers } from "@/db/schema";
import { CBSE_CHAPTERS } from "@/content/cbse-chapters";
import {
  evaluateAssignment, type AssignmentRule, type ChapterInfo, type CourseVersionInfo, type EvaluationResult, type Expr,
} from "@/engine/assignment";

/** Upper bound for one admin-triggered recalculation. Larger runs are split across requests (see recalculateAll). */
export const MAX_RECALC_STUDENTS = 20_000;
const BATCH = 500;

/**
 * The chapters that count for course assignment. A student who turned CBSE-specific review off goes back to the standard
 * (default) versions, which is exactly what evaluating no completed chapters does: no chapter rule matches, the fallback wins.
 */
export const effectiveChapters = (chaptersDone: readonly string[], cbseReview: boolean): readonly string[] =>
  (cbseReview ? chaptersDone : []);

/** Chapters come from content (cbse-chapters.ts). Deactivating one there is a content change; rules naming it are reported, not guessed. */
export const chapterCatalog = (): ChapterInfo[] => CBSE_CHAPTERS.map((c) => ({ id: c.id, grade: c.grade, active: c.active !== false }));

type RuleRow = typeof assignmentRules.$inferSelect;
type VersionRow = typeof courseVersions.$inferSelect;

export const toRule = (r: RuleRow): AssignmentRule => ({
  id: r.id, name: r.name, active: r.status === "live", priority: r.priority, targetVersionId: r.targetVersionId, when: r.condition ?? null, audienceGroupId: r.groupId,
  effectiveFrom: r.effectiveFrom?.toISOString() ?? null, effectiveUntil: r.effectiveUntil?.toISOString() ?? null,
});
export const toVersion = (v: VersionRow): CourseVersionInfo => ({ id: v.id, published: v.status === "published" });

export async function loadCatalogData(client: Pick<typeof db, "select"> = db) {
  const [ruleRows, versionRows] = await Promise.all([
    client.select().from(assignmentRules).orderBy(asc(assignmentRules.id)),
    client.select().from(courseVersions).orderBy(asc(courseVersions.id)),
  ]);
  const versions = versionRows.map(toVersion);
  const courseOfVersion = new Map(versionRows.map((v) => [v.id, v.courseId]));
  const courses = [...new Set(versionRows.map((v) => v.courseId))].sort();
  const fallbackByCourse = new Map(versionRows.filter((v) => v.isFallback && v.status === "published").map((v) => [v.courseId, v.id]));
  return { rules: ruleRows.map(toRule), versions, courses, courseOfVersion, fallbackByCourse, versionRows, ruleRows };
}
type CatalogData = Awaited<ReturnType<typeof loadCatalogData>>;

/**
 * Pure decision for one student's chapters against loaded data: one result per course, because a student has one version
 * of every course. Rules and fallbacks only compete inside their own course. Used by evaluation, recalculation and previews.
 */
export function decide(data: CatalogData, student: { completed: readonly string[]; groupIds?: readonly string[] }, now: Date, rules = data.rules): Record<string, EvaluationResult> {
  const out: Record<string, EvaluationResult> = {};
  for (const courseId of data.courses) {
    const inCourse = (versionId: string) => data.courseOfVersion.get(versionId) === courseId;
    out[courseId] = evaluateAssignment({
      completed: student.completed, groupIds: student.groupIds, chapters: chapterCatalog(), now,
      versions: data.versions.filter((v) => inCourse(v.id)),
      rules: rules.filter((r) => inCourse(r.targetVersionId)),
      fallbackVersionId: data.fallbackByCourse.get(courseId) ?? null,
    });
  }
  return out;
}

const outcomeVersion = (r: EvaluationResult) => (r.outcome === "unresolved" ? null : r.versionId);
const outcomeRule = (r: EvaluationResult) => (r.outcome === "assigned" ? r.ruleId : null);

/**
 * Store a student's outcome. History gets a row only when the decision changed, so it reads as a list of decisions
 * rather than one row per re-check. Returns whether anything changed.
 */
export async function persistOutcome(tx: Tx, userId: string, courseId: string, result: EvaluationResult, now: Date): Promise<boolean> {
  const mine = and(eq(studentCourseAssignments.userId, userId), eq(studentCourseAssignments.courseId, courseId));
  const [current] = await tx.select().from(studentCourseAssignments).where(mine).for("update");
  const version = outcomeVersion(result), rule = outcomeRule(result);
  const same = !!current && current.versionId === version && current.ruleId === rule && current.outcome === result.outcome;
  if (same) return false;

  await tx.insert(assignmentHistory).values({
    userId, courseId, versionId: version, ruleId: rule, outcome: result.outcome, reason: result.reason,
    detail: {
      issues: result.issues,
      ...(result.outcome === "assigned" ? { matchedRuleIds: result.matchedRuleIds, shadowedRuleIds: result.shadowedRuleIds } : {}),
    },
    evaluatedAt: now,
  });
  if (version) {
    await tx.insert(studentCourseAssignments).values({ userId, courseId, versionId: version, ruleId: rule, outcome: result.outcome, assignedAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: [studentCourseAssignments.userId, studentCourseAssignments.courseId], set: { versionId: version, ruleId: rule, outcome: result.outcome, assignedAt: now, updatedAt: now } });
  } else if (current) {
    await tx.delete(studentCourseAssignments).where(mine);
  }
  return true;
}

/** Store a student's outcome for every course in one transaction. Returns whether any course changed. */
async function persistAll(userId: string, results: Record<string, EvaluationResult>, now: Date): Promise<boolean> {
  return db.transaction(async (tx) => {
    let changed = false;
    for (const [courseId, result] of Object.entries(results)) if (await persistOutcome(tx as unknown as Tx, userId, courseId, result, now)) changed = true;
    return changed;
  });
}

/** Re-evaluate one student from their current chapters and store the result for each course. Safe to call repeatedly. */
export async function evaluateStudent(userId: string, now = new Date()): Promise<{ results: Record<string, EvaluationResult>; changed: boolean }> {
  const data = await loadCatalogData();
  const [profile] = await db.select({ chaptersDone: profiles.chaptersDone, cbseReview: profiles.cbseReview }).from(profiles).where(eq(profiles.id, userId));
  if (!profile) throw new Error("no profile for course assignment");
  const groupIds = (await db.select({ id: userGroupMembers.groupId }).from(userGroupMembers).where(eq(userGroupMembers.userId, userId))).map((g) => g.id);
  const results = decide(data, { completed: effectiveChapters(profile.chaptersDone, profile.cbseReview), groupIds }, now);
  const changed = await persistAll(userId, results, now);
  return { results, changed };
}

/** Walk every student in id order, in batches, so memory stays bounded however many students there are. */
async function* students(client: Pick<typeof db, "select">, limit: number) {
  let after = "00000000-0000-0000-0000-000000000000", seen = 0;
  while (seen < limit) {
    const rows = await client.select({ id: profiles.id, chaptersDone: profiles.chaptersDone, cbseReview: profiles.cbseReview }).from(profiles)
      .where(gt(profiles.id, after)).orderBy(asc(profiles.id)).limit(Math.min(BATCH, limit - seen));
    if (!rows.length) return;
    const memberships = await client.select({ userId: userGroupMembers.userId, groupId: userGroupMembers.groupId }).from(userGroupMembers)
      .where(inArray(userGroupMembers.userId, rows.map((r) => r.id)));
    const groupsOf = new Map<string, string[]>();
    for (const m of memberships) groupsOf.set(m.userId, [...(groupsOf.get(m.userId) ?? []), m.groupId]);
    for (const r of rows) yield { ...r, groupIds: groupsOf.get(r.id) ?? [] };
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
    if (await persistAll(s.id, decide(data, { completed: effectiveChapters(s.chaptersDone, s.cbseReview), groupIds: s.groupIds }, now), now)) changed++;
    evaluated++;
  }
  return { evaluated, changed, capped: evaluated >= limit };
}

/**
 * What would change if these rules were live, for one course: counts only, never student records. `proposed` is the
 * complete rule set as it would be after the change. Read-only.
 */
export async function previewImpact(proposed: AssignmentRule[], courseId: string, data?: CatalogData, now = new Date(), limit = MAX_RECALC_STUDENTS) {
  const base = data ?? (await loadCatalogData());
  const current = new Map((await db.select({ userId: studentCourseAssignments.userId, versionId: studentCourseAssignments.versionId })
    .from(studentCourseAssignments).where(eq(studentCourseAssignments.courseId, courseId))).map((r) => [r.userId, r.versionId]));
  const out = { students: 0, toNewVersion: 0, newlyAssigned: 0, becomesUnassigned: 0, unchanged: 0, capped: false };
  for await (const s of students(db, limit)) {
    out.students++;
    const result = decide(base, { completed: effectiveChapters(s.chaptersDone, s.cbseReview), groupIds: s.groupIds }, now, proposed)[courseId];
    const next = result ? outcomeVersion(result) : null;
    const before = current.get(s.id) ?? null;
    if (next === before) out.unchanged++;
    else if (before === null) out.newlyAssigned++;
    else if (next === null) out.becomesUnassigned++;
    else out.toNewVersion++;
  }
  out.capped = out.students >= limit;
  return out;
}

/** The student's current version of each course and why, for the Start page. Empty when nothing is assigned. */
export async function studentAssignments(userId: string) {
  const rows = await db.select({ courseId: studentCourseAssignments.courseId, courseTitle: courses.title, versionId: studentCourseAssignments.versionId, outcome: studentCourseAssignments.outcome, name: courseVersions.name, description: courseVersions.description, assignedAt: studentCourseAssignments.assignedAt })
    .from(studentCourseAssignments).innerJoin(courseVersions, eq(courseVersions.id, studentCourseAssignments.versionId))
    .leftJoin(courses, eq(courses.id, studentCourseAssignments.courseId))
    .where(eq(studentCourseAssignments.userId, userId)).orderBy(asc(studentCourseAssignments.courseId));
  return Promise.all(rows.map(async (row) => {
    const [last] = await db.select({ reason: assignmentHistory.reason }).from(assignmentHistory)
      .where(and(eq(assignmentHistory.userId, userId), eq(assignmentHistory.courseId, row.courseId))).orderBy(sql`${assignmentHistory.evaluatedAt} desc`).limit(1);
    return { ...row, reason: last?.reason ?? null };
  }));
}

/** Rule condition, in plain form, for the rule builder and previews. */
export const conditionChapters = (expr: Expr | null): string[] => (!expr ? [] : "chapter" in expr ? [expr.chapter] : ("all" in expr ? expr.all : expr.any).flatMap(conditionChapters));

/** Refresh one student's course after their chapters change. A failure is logged, never shown: saving the profile matters more. */
export async function refreshCourseAssignment(userId: string) {
  try {
    await evaluateStudent(userId);
  } catch (err) {
    console.error("course assignment refresh failed", err);
  }
}
