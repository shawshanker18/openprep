import "server-only";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { assignmentHistory, assignmentRules, courses, courseVersions, profiles, studentCourseAssignments, userGroupMembers } from "@/db/schema";
import { CBSE_CHAPTERS } from "@/content/cbse-chapters";
import {
  evaluateAssignment, type AssignmentRule, type ChapterInfo, type CourseVersionInfo, type EvaluationResult,
} from "@/engine/assignment";

export const MAX_RECALC_STUDENTS = 20_000;
const BATCH = 500;

export const chapterCatalog = (): ChapterInfo[] => CBSE_CHAPTERS.map((c) => ({ id: c.id, grade: c.grade, active: true }));

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

async function persistAll(userId: string, results: Record<string, EvaluationResult>, now: Date): Promise<boolean> {
  return db.transaction(async (tx) => {
    let changed = false;
    for (const [courseId, result] of Object.entries(results)) if (await persistOutcome(tx as unknown as Tx, userId, courseId, result, now)) changed = true;
    return changed;
  });
}

export async function evaluateStudent(userId: string, now = new Date()): Promise<{ results: Record<string, EvaluationResult>; changed: boolean }> {
  const data = await loadCatalogData();
  const [profile] = await db.select({ chaptersDone: profiles.chaptersDone }).from(profiles).where(eq(profiles.id, userId));
  if (!profile) throw new Error("no profile for course assignment");
  const groupIds = (await db.select({ id: userGroupMembers.groupId }).from(userGroupMembers).where(eq(userGroupMembers.userId, userId))).map((g) => g.id);
  const results = decide(data, { completed: profile.chaptersDone, groupIds }, now);
  const changed = await persistAll(userId, results, now);
  return { results, changed };
}

async function* students(client: Pick<typeof db, "select">, limit: number) {
  let after = "00000000-0000-0000-0000-000000000000", seen = 0;
  while (seen < limit) {
    const rows = await client.select({ id: profiles.id, chaptersDone: profiles.chaptersDone }).from(profiles)
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

export async function recalculateAll(now = new Date(), limit = MAX_RECALC_STUDENTS) {
  const data = await loadCatalogData();
  let evaluated = 0, changed = 0;
  for await (const s of students(db, limit)) {
    if (await persistAll(s.id, decide(data, { completed: s.chaptersDone, groupIds: s.groupIds }, now), now)) changed++;
    evaluated++;
  }
  return { evaluated, changed, capped: evaluated >= limit };
}

export async function previewImpact(proposed: AssignmentRule[], courseId: string, data?: CatalogData, now = new Date(), limit = MAX_RECALC_STUDENTS) {
  const base = data ?? (await loadCatalogData());
  const current = new Map((await db.select({ userId: studentCourseAssignments.userId, versionId: studentCourseAssignments.versionId })
    .from(studentCourseAssignments).where(eq(studentCourseAssignments.courseId, courseId))).map((r) => [r.userId, r.versionId]));
  const out = { students: 0, toNewVersion: 0, newlyAssigned: 0, becomesUnassigned: 0, unchanged: 0, capped: false };
  for await (const s of students(db, limit)) {
    out.students++;
    const result = decide(base, { completed: s.chaptersDone, groupIds: s.groupIds }, now, proposed)[courseId];
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

export async function refreshCourseAssignment(userId: string) {
  try {
    await evaluateStudent(userId);
  } catch (err) {
    console.error("course assignment refresh failed", err);
  }
}
