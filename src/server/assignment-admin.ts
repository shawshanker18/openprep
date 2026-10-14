// Admin writes for course assignment: parse, validate, save, publish, audit. Callers must have
// checked admin rights already (see app/admin/assignments/actions.ts); every function here re-validates its input.
import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assignmentRules, courseSkills, courses, courseVersionLessons, courseVersions, userGroups } from "@/db/schema";
import { CBSE_CHAPTERS } from "@/content/cbse-chapters";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { ensureCourse } from "@/server/course-builder";
import { audit } from "@/server/admin";
import { exprProblem, validateRule, type AssignmentRule, type Expr } from "@/engine/assignment";
import { chapterCatalog, loadCatalogData, previewImpact, recalculateAll, toRule } from "@/server/course-assignment";

export const RULE_SLOTS = 8;
const KNOWN_CHAPTERS = new Set(CBSE_CHAPTERS.map((c) => c.id));
const STATUSES = ["draft", "live", "disabled"] as const;

const Rule = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Give the rule a name").max(120),
  description: z.string().trim().max(500).default(""),
  status: z.enum(STATUSES),
  priority: z.coerce.number().int().min(-1000).max(1000),
  targetVersionId: z.string().min(1, "Choose a course version"),
  op: z.enum(["all", "any"]),
  chapters: z.array(z.string()).max(RULE_SLOTS),
  /** Only members of this group can match. Blank = every student. */
  groupId: z.union([z.literal(""), z.uuid()]).optional(),
  effectiveFrom: z.string().trim().optional(),
  effectiveUntil: z.string().trim().optional(),
});
export type RuleInput = z.infer<typeof Rule>;

const Version = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/, "Use lowercase letters, numbers and dashes (2–63 characters)"),
  courseId: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1, "Give the version a name").max(120),
  description: z.string().trim().max(500).default(""),
  status: z.enum(["draft", "published", "retired"]),
  isFallback: z.boolean().default(false),
});
export type VersionInput = z.infer<typeof Version>;

export type Problem = { field: string; message: string };
type Ok<T> = { ok: true; value: T } | { ok: false; problems: Problem[] };

const dateOrNull = (v: string | undefined) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
};

/** Turn the form's chapter slots into one condition. Blank slots are ignored; duplicates collapse. */
export function buildCondition(op: "all" | "any", chapters: string[]): Expr | null {
  const picked = [...new Set(chapters.filter(Boolean))];
  if (!picked.length) return null;
  return op === "all" ? { all: picked.map((c) => ({ chapter: c })) } : { any: picked.map((c) => ({ chapter: c })) };
}

/** Everything wrong with a rule draft, reported together so the admin fixes them in one pass. */
export async function ruleProblems(input: RuleInput, expr: Expr | null): Promise<Problem[]> {
  const problems: Problem[] = [];
  if (!expr && !input.groupId) problems.push({ field: "chapters", message: "Choose at least one completed chapter, or a user group" });
  if (expr) {
    const p = exprProblem(expr);
    if (p) problems.push({ field: "chapters", message: `Condition is invalid: ${p}` });
    for (const c of new Set(collect(expr))) {
      if (!KNOWN_CHAPTERS.has(c)) problems.push({ field: "chapters", message: `Unknown chapter ${c}` });
    }
  }
  const from = dateOrNull(input.effectiveFrom), until = dateOrNull(input.effectiveUntil);
  if (from === "invalid") problems.push({ field: "effectiveFrom", message: "Start date is not a valid date" });
  if (until === "invalid") problems.push({ field: "effectiveUntil", message: "End date is not a valid date" });
  if (from instanceof Date && until instanceof Date && from >= until) problems.push({ field: "effectiveUntil", message: "End date must be after the start date" });

  if (input.groupId) {
    const [group] = await db.select({ id: userGroups.id }).from(userGroups).where(eq(userGroups.id, input.groupId));
    if (!group) problems.push({ field: "groupId", message: "That user group does not exist" });
  }
  const data = await loadCatalogData();
  const version = data.versions.find((v) => v.id === input.targetVersionId);
  if (!version) problems.push({ field: "targetVersionId", message: "That course version does not exist" });
  else if (input.status === "live" && !version.published) problems.push({ field: "targetVersionId", message: "A live rule must target a published course version" });
  return problems;
}
const collect = (e: Expr): string[] => ("chapter" in e ? [e.chapter] : ("all" in e ? e.all : e.any).flatMap(collect));

/** Validate and save a rule. Saving a draft never changes anyone's course; only publishing does (see setRuleStatus). */
export async function saveRule(adminId: string, form: unknown): Promise<Ok<{ id: string }>> {
  const parsed = Rule.safeParse(form);
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "form"), message: i.message })) };
  const input = parsed.data;
  const expr = buildCondition(input.op, input.chapters);
  const problems = await ruleProblems(input, expr);
  if (problems.length) return { ok: false, problems };

  const row = {
    name: input.name, description: input.description, status: input.status, priority: input.priority,
    targetVersionId: input.targetVersionId, condition: expr, groupId: input.groupId || null,
    effectiveFrom: dateOrNull(input.effectiveFrom) as Date | null, effectiveUntil: dateOrNull(input.effectiveUntil) as Date | null,
    updatedBy: adminId, updatedAt: new Date(),
  };
  const id = await db.transaction(async (tx) => {
    if (input.id) {
      const [updated] = await tx.update(assignmentRules).set(row).where(eq(assignmentRules.id, input.id)).returning({ id: assignmentRules.id });
      if (!updated) throw new Error("rule not found");
      return updated.id;
    }
    const [created] = await tx.insert(assignmentRules).values({ ...row, createdBy: adminId }).returning({ id: assignmentRules.id });
    return created!.id;
  });
  await audit(adminId, input.id ? "assignment_rule.update" : "assignment_rule.create", id, { status: input.status, priority: input.priority, target: input.targetVersionId });
  return { ok: true, value: { id } };
}

/**
 * Publish, disable or return a rule to draft. Going live checks the whole rule again and recalculates students at once,
 * so the outcome of publishing is the same whichever admin does it.
 */
export async function setRuleStatus(adminId: string, id: string, status: (typeof STATUSES)[number]): Promise<Ok<{ evaluated: number; changed: number; capped: boolean }>> {
  const [row] = await db.select().from(assignmentRules).where(eq(assignmentRules.id, id));
  if (!row) return { ok: false, problems: [{ field: "id", message: "Rule not found" }] };
  if (status === "live") {
    const data = await loadCatalogData();
    const rule = toRule({ ...row, status: "live" });
    const issues = validateRule(rule, { chapters: chapterCatalog(), versions: data.versions });
    const problems = issues.map((i) => ({ field: "rule", message: describeIssue(i) }));
    if (problems.length) return { ok: false, problems };
  }
  await db.update(assignmentRules).set({ status, updatedBy: adminId, updatedAt: new Date() }).where(eq(assignmentRules.id, id));
  await audit(adminId, `assignment_rule.${status}`, id);
  const run = await recalculateAll();
  await audit(adminId, "assignment.recalculate", id, { evaluated: run.evaluated, changed: run.changed, capped: run.capped });
  return { ok: true, value: run };
}

const describeIssue = (i: ReturnType<typeof validateRule>[number]) => {
  switch (i.issue) {
    case "invalid_expression": return `Condition is invalid: ${i.detail}`;
    case "unknown_chapter": return `Unknown chapter ${i.chapterId}`;
    case "inactive_chapter": return `Chapter ${i.chapterId} is no longer active`;
    case "unknown_version": return "The target course version does not exist";
    case "inactive_version": return "The target course version is not published";
  }
};

/** What publishing this draft would change, as counts. Read-only: nothing is written. */
export async function previewRuleImpact(id: string | null, form: unknown) {
  const parsed = Rule.safeParse({ ...(form as object), id: id ?? undefined });
  if (!parsed.success) return { ok: false as const, problems: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "form"), message: i.message })) };
  const input = parsed.data;
  const expr = buildCondition(input.op, input.chapters);
  if (!expr && !input.groupId) return { ok: false as const, problems: [{ field: "chapters", message: "Choose at least one completed chapter, or a user group" }] };
  const data = await loadCatalogData();
  const others = data.rules.filter((r) => r.id !== id);
  const candidate: AssignmentRule = {
    id: id ?? "preview-candidate", name: input.name, active: input.status === "live", priority: input.priority,
    targetVersionId: input.targetVersionId, when: expr, audienceGroupId: input.groupId || null,
    effectiveFrom: dateOrNull(input.effectiveFrom) instanceof Date ? (dateOrNull(input.effectiveFrom) as Date).toISOString() : null,
    effectiveUntil: dateOrNull(input.effectiveUntil) instanceof Date ? (dateOrNull(input.effectiveUntil) as Date).toISOString() : null,
  };
  const courseId = data.courseOfVersion.get(input.targetVersionId);
  if (!courseId) return { ok: false as const, problems: [{ field: "targetVersionId", message: "That course version does not exist" }] };
  const impact = await previewImpact([...others, candidate], courseId, data);
  return { ok: true as const, impact };
}

/** Create or edit a course version. Each course has at most one fallback version, and only a published one can be. */
export async function saveVersion(adminId: string, form: unknown): Promise<Ok<{ id: string }>> {
  const raw = form as Record<string, unknown>;
  const parsed = Version.safeParse({ ...raw, isFallback: raw.isFallback === "on" || raw.isFallback === true });
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "form"), message: i.message })) };
  const v = parsed.data;
  if (v.isFallback && v.status !== "published") return { ok: false, problems: [{ field: "isFallback", message: "Only a published version can be the fallback" }] };
  const [course] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, v.courseId));
  if (!course) return { ok: false, problems: [{ field: "courseId", message: "That course does not exist. Create the course first." }] };
  await db.transaction(async (tx) => {
    if (v.isFallback) await tx.update(courseVersions).set({ isFallback: false }).where(and(eq(courseVersions.isFallback, true), eq(courseVersions.courseId, v.courseId), ne(courseVersions.id, v.id)));
    await tx.insert(courseVersions).values({ id: v.id, courseId: v.courseId, name: v.name, description: v.description, status: v.status, isFallback: v.isFallback })
      .onConflictDoUpdate({ target: courseVersions.id, set: { courseId: v.courseId, name: v.name, description: v.description, status: v.status, isFallback: v.isFallback, updatedAt: new Date() } });
  });
  await audit(adminId, "course_version.save", v.id, { status: v.status, fallback: v.isFallback });
  // Publishing, retiring or moving the fallback changes where students land, so recalculate every time.
  const run = await recalculateAll();
  await audit(adminId, "assignment.recalculate", v.id, { evaluated: run.evaluated, changed: run.changed, capped: run.capped });
  return { ok: true, value: { id: v.id } };
}

/** Lesson text for one skill of one version, as admins edit it: the `##` sections, with any pasted frontmatter removed. */
const LessonText = z.object({
  versionId: z.string().min(1),
  skillId: z.string().min(1),
  body: z.string().max(40_000, "Lesson is too long (40,000 characters at most)"),
  minutes: z.union([z.literal(""), z.coerce.number().int().min(1).max(120)]).optional(),
});

export const stripFrontmatter = (md: string) => md.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();

/** Save the lesson a version teaches for one of its course's skills. Takes effect for students on that version at once. */
export async function saveVersionLesson(adminId: string, form: unknown): Promise<Ok<{ versionId: string; skillId: string }>> {
  const parsed = LessonText.safeParse(form);
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "form"), message: i.message })) };
  const { versionId, skillId, minutes } = parsed.data;
  const body = stripFrontmatter(parsed.data.body);
  const [version] = await db.select().from(courseVersions).where(eq(courseVersions.id, versionId));
  if (!version) return { ok: false, problems: [{ field: "versionId", message: "That course version does not exist" }] };
  const [owned] = await db.select({ skillId: courseSkills.skillId }).from(courseSkills).where(and(eq(courseSkills.skillId, skillId), eq(courseSkills.courseId, version.courseId)));
  if (!owned) return { ok: false, problems: [{ field: "skillId", message: "That skill is not part of this course" }] };
  if (!/^## \S/m.test(body)) return { ok: false, problems: [{ field: "body", message: "Start each section with a \"## Heading\" line" }] };
  const mins = typeof minutes === "number" ? minutes : null;
  await db.insert(courseVersionLessons).values({ versionId, skillId, body, minutes: mins, updatedBy: adminId })
    .onConflictDoUpdate({ target: [courseVersionLessons.versionId, courseVersionLessons.skillId], set: { body, minutes: mins, updatedBy: adminId, updatedAt: new Date() } });
  await audit(adminId, "course_version.lesson_save", versionId, { skillId, chars: body.length });
  return { ok: true, value: { versionId, skillId } };
}

/** Drop a version's own text for a skill, so it teaches the built-in lesson again. */
export async function resetVersionLesson(adminId: string, versionId: string, skillId: string): Promise<Ok<{ removed: boolean }>> {
  const gone = await db.delete(courseVersionLessons).where(and(eq(courseVersionLessons.versionId, versionId), eq(courseVersionLessons.skillId, skillId))).returning({ skillId: courseVersionLessons.skillId });
  if (gone.length) await audit(adminId, "course_version.lesson_reset", versionId, { skillId });
  return { ok: true, value: { removed: gone.length > 0 } };
}

/**
 * Publish a course version and take its draft rules live in one step, then recalculate students once. This is the
 * "go live" button for a chapter route: the version must be published before a rule may target it, so doing it by hand
 * means two saves and two recalculations.
 */
export async function publishVersion(adminId: string, versionId: string): Promise<Ok<{ rules: number; evaluated: number; changed: number; capped: boolean }>> {
  const [version] = await db.select().from(courseVersions).where(eq(courseVersions.id, versionId));
  if (!version) return { ok: false, problems: [{ field: "id", message: "That course version does not exist" }] };
  if (version.status === "retired") return { ok: false, problems: [{ field: "id", message: "A retired version cannot be published" }] };

  // Check the draft rules as they would be once live, before anything is written.
  const data = await loadCatalogData();
  const versions = data.versions.map((v) => (v.id === versionId ? { ...v, published: true } : v));
  const drafts = data.ruleRows.filter((r) => r.targetVersionId === versionId && r.status === "draft");
  const problems = drafts.flatMap((r) => validateRule(toRule({ ...r, status: "live" }), { chapters: chapterCatalog(), versions }).map((i) => ({ field: "rule", message: `${r.name}: ${describeIssue(i)}` })));
  if (problems.length) return { ok: false, problems };

  await db.transaction(async (tx) => {
    await tx.update(courseVersions).set({ status: "published", updatedAt: new Date() }).where(eq(courseVersions.id, versionId));
    for (const r of drafts) await tx.update(assignmentRules).set({ status: "live", updatedBy: adminId, updatedAt: new Date() }).where(eq(assignmentRules.id, r.id));
  });
  await audit(adminId, "course_version.publish", versionId, { rules: drafts.length });
  const run = await recalculateAll();
  await audit(adminId, "assignment.recalculate", versionId, { evaluated: run.evaluated, changed: run.changed, capped: run.capped });
  return { ok: true, value: { rules: drafts.length, ...run } };
}

/* ───────── courses ───────── */
const CourseForm = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/, "Use lowercase letters, numbers and dashes (2–63 characters)"),
  title: z.string().trim().min(1, "Give the course a title").max(120),
  chapterId: z.string().optional(),
  skills: z.array(z.string()).max(20),
});

/**
 * Create a course, or edit an existing one's title, chapter and skills. A new course also gets its default version
 * (published, the course's fallback), its covered version (draft) and, when it names a chapter, a draft rule that sends
 * students who finished that chapter to the covered version. Nothing reaches students until published.
 */
export async function saveCourse(adminId: string, form: unknown): Promise<Ok<{ id: string; created: boolean }>> {
  const parsed = CourseForm.safeParse(form);
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "form"), message: i.message })) };
  const { id, title } = parsed.data;
  const chapterId = parsed.data.chapterId || null;
  const skills = [...new Set(parsed.data.skills.filter(Boolean))];
  const problems: Problem[] = [];
  if (chapterId && !KNOWN_CHAPTERS.has(chapterId)) problems.push({ field: "chapterId", message: `Unknown chapter ${chapterId}` });
  for (const s of skills) if (!SKILL_BY_ID[s]) problems.push({ field: "skills", message: `Unknown skill ${s}` });

  const owners = new Map((await db.select().from(courseSkills)).map((r) => [r.skillId, r.courseId]));
  for (const s of skills) if (owners.get(s) && owners.get(s) !== id) problems.push({ field: "skills", message: `${SKILL_BY_ID[s]?.name ?? s} already belongs to the course ${owners.get(s)}` });
  const [existing] = await db.select().from(courses).where(eq(courses.id, id));
  // Dropping a skill that a version has customised would orphan that text, so it has to be reset first.
  for (const [skill, owner] of owners) {
    if (owner !== id || skills.includes(skill)) continue;
    const [text] = await db.select({ v: courseVersionLessons.versionId }).from(courseVersionLessons)
      .innerJoin(courseVersions, eq(courseVersions.id, courseVersionLessons.versionId))
      .where(and(eq(courseVersionLessons.skillId, skill), eq(courseVersions.courseId, id))).limit(1);
    if (text) problems.push({ field: "skills", message: `${SKILL_BY_ID[skill]?.name ?? skill} has customised lessons. Reset them before removing the skill.` });
  }
  if (problems.length) return { ok: false, problems };

  if (!existing) {
    await ensureCourse(db as never, { id, title, chapterId, skills });
    await audit(adminId, "course.create", id, { chapterId, skills });
    return { ok: true, value: { id, created: true } };
  }
  await db.transaction(async (tx) => {
    await tx.update(courses).set({ title, chapterId, updatedAt: new Date() }).where(eq(courses.id, id));
    await tx.delete(courseSkills).where(eq(courseSkills.courseId, id));
    if (skills.length) await tx.insert(courseSkills).values(skills.map((skillId) => ({ skillId, courseId: id })));
  });
  await audit(adminId, "course.update", id, { chapterId, skills });
  return { ok: true, value: { id, created: false } };
}
