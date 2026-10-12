// Admin writes for course assignment: parse, validate, save, publish, audit. Callers must have
// checked admin rights already (see app/admin/assignments/actions.ts); every function here re-validates its input.
import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assignmentRules, courseVersions } from "@/db/schema";
import { CBSE_CHAPTERS } from "@/content/cbse-chapters";
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
  if (!expr) problems.push({ field: "chapters", message: "Choose at least one completed chapter" });
  else {
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
  if (problems.length || !expr) return { ok: false, problems };

  const row = {
    name: input.name, description: input.description, status: input.status, priority: input.priority,
    targetVersionId: input.targetVersionId, condition: expr,
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
  if (!expr) return { ok: false as const, problems: [{ field: "chapters", message: "Choose at least one completed chapter" }] };
  const data = await loadCatalogData();
  const others = data.rules.filter((r) => r.id !== id);
  const candidate: AssignmentRule = {
    id: id ?? "preview-candidate", name: input.name, active: input.status === "live", priority: input.priority,
    targetVersionId: input.targetVersionId, when: expr,
    effectiveFrom: dateOrNull(input.effectiveFrom) instanceof Date ? (dateOrNull(input.effectiveFrom) as Date).toISOString() : null,
    effectiveUntil: dateOrNull(input.effectiveUntil) instanceof Date ? (dateOrNull(input.effectiveUntil) as Date).toISOString() : null,
  };
  const impact = await previewImpact([...others, candidate], data);
  return { ok: true as const, impact };
}

/** Create or edit a course version. Only one version can be the fallback, and only a published one can be. */
export async function saveVersion(adminId: string, form: unknown): Promise<Ok<{ id: string }>> {
  const raw = form as Record<string, unknown>;
  const parsed = Version.safeParse({ ...raw, isFallback: raw.isFallback === "on" || raw.isFallback === true });
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "form"), message: i.message })) };
  const v = parsed.data;
  if (v.isFallback && v.status !== "published") return { ok: false, problems: [{ field: "isFallback", message: "Only a published version can be the fallback" }] };
  await db.transaction(async (tx) => {
    if (v.isFallback) await tx.update(courseVersions).set({ isFallback: false }).where(and(eq(courseVersions.isFallback, true), ne(courseVersions.id, v.id)));
    await tx.insert(courseVersions).values({ id: v.id, courseId: v.courseId, name: v.name, description: v.description, status: v.status, isFallback: v.isFallback })
      .onConflictDoUpdate({ target: courseVersions.id, set: { courseId: v.courseId, name: v.name, description: v.description, status: v.status, isFallback: v.isFallback, updatedAt: new Date() } });
  });
  await audit(adminId, "course_version.save", v.id, { status: v.status, fallback: v.isFallback });
  // Publishing, retiring or moving the fallback changes where students land, so recalculate every time.
  const run = await recalculateAll();
  await audit(adminId, "assignment.recalculate", v.id, { evaluated: run.evaluated, changed: run.changed, capped: run.capped });
  return { ok: true, value: { id: v.id } };
}
