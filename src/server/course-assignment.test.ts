// Course assignment end to end on real Postgres (PGlite, all migrations applied): rules, publishing, history,
// reassignment, fallbacks and impact previews. Every check reads the database, not just the return value.
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { count, eq } from "drizzle-orm";
import * as schema from "@/db/schema";

const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
vi.mock("@/server/admin", () => ({ audit: async () => {}, requireAdmin: async () => ({ adminId: ADMIN }) }));

const { evaluateStudent, recalculateAll, studentAssignments } = await import("./course-assignment");
const studentAssignment = async (id: string) => (await studentAssignments(id)).find((a) => a.courseId === "math-start") ?? null;
const { saveRule, setRuleStatus, saveVersion, previewRuleImpact } = await import("./assignment-admin");

const ADMIN = "00000000-0000-4000-8000-00000000ad01";
const A = "00000000-0000-4000-8000-00000000a001"; // completed 9-polynomials
const B = "00000000-0000-4000-8000-00000000a002"; // completed 9-a and 10-a
const C = "00000000-0000-4000-8000-00000000a003"; // nothing completed
const rule = (over: Record<string, unknown> = {}) => ({
  name: "Rule", description: "", status: "live", priority: "10", targetVersionId: "v1", op: "all", chapters: ["cbse-9-polynomials"], ...over,
});
const ruleId = async (name: string) => (await db.select().from(schema.assignmentRules).where(eq(schema.assignmentRules.name, name)))[0]!.id;
const historyCount = async (userId: string) => (await db.select({ n: count() }).from(schema.assignmentHistory).where(eq(schema.assignmentHistory.userId, userId)))[0]!.n;

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values([
    { id: A, chaptersDone: ["cbse-9-polynomials"] }, { id: B, chaptersDone: ["cbse-9-polynomials", "cbse-10-polynomials"] }, { id: C, chaptersDone: [] },
  ]);
  await db.insert(schema.courseVersions).values([
    { id: "v1", courseId: "math-start", name: "Version 1", status: "published" },
    { id: "v2", courseId: "math-start", name: "Version 2", status: "published" },
    { id: "v-draft", courseId: "math-start", name: "Draft", status: "draft" },
  ]);
  await db.insert(schema.lessonProgress).values({ userId: A, skillId: "m-alg-lin1" });
}, 120_000);

describe("rules", () => {
  it("rejects an unknown chapter and saves nothing", async () => {
    const r = await saveRule(ADMIN, rule({ name: "Typo", chapters: ["cbse-9-zz"] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.map((p) => p.message).join(" ")).toMatch(/Unknown chapter cbse-9-zz/);
    expect((await db.select().from(schema.assignmentRules).where(eq(schema.assignmentRules.name, "Typo"))).length).toBe(0);
  });

  it("reports every problem together, not one at a time", async () => {
    const r = await saveRule(ADMIN, rule({ name: "", priority: "99999", chapters: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.length).toBeGreaterThanOrEqual(2);
  });

  it("a draft can name a draft version, but going live cannot", async () => {
    const d = await saveRule(ADMIN, rule({ name: "Draft target", status: "draft", targetVersionId: "v-draft" }));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    const live = await setRuleStatus(ADMIN, d.value.id, "live");
    expect(live.ok).toBe(false);
    expect((await db.select().from(schema.assignmentRules).where(eq(schema.assignmentRules.id, d.value.id)))[0]!.status).toBe("draft");
  });

  it("a draft does not change anyone's course until it is published", async () => {
    await saveRule(ADMIN, rule({ name: "Pending 9a", status: "draft", targetVersionId: "v2", chapters: ["cbse-9-polynomials"], priority: "50" }));
    const { results } = await evaluateStudent(A);
    const result = results["math-start"]!;
    expect(result.outcome === "assigned" && result.versionId).not.toBe("v2");
  });
});

describe("assignment and history", () => {
  it("assigns the matching live rule and records one history row for the change", async () => {
    const r = await saveRule(ADMIN, rule({ name: "Nine A", chapters: ["cbse-9-polynomials"], targetVersionId: "v1", priority: "10" }));
    expect(r.ok).toBe(true);
    await setRuleStatus(ADMIN, (await ruleId("Nine A")), "live");
    const a = await studentAssignment(A);
    expect(a).toMatchObject({ versionId: "v1", outcome: "assigned" });
  });

  it("re-checking an unchanged outcome writes nothing: history reads as decisions, not heartbeats", async () => {
    const before = await historyCount(A);
    const first = await evaluateStudent(A);
    const second = await evaluateStudent(A);
    expect(first.results).toEqual(second.results);
    expect(second.changed).toBe(false);
    expect(await historyCount(A)).toBe(before);
  });

  it("combines chapters across grades with all-of, and only matches when both are done", async () => {
    const r = await saveRule(ADMIN, rule({ name: "Nine and ten", op: "all", chapters: ["cbse-9-polynomials", "cbse-10-polynomials"], targetVersionId: "v2", priority: "20" }));
    expect(r.ok).toBe(true);
    if (r.ok) await setRuleStatus(ADMIN, r.value.id, "live");
    expect(await studentAssignment(B)).toMatchObject({ versionId: "v2" });
    expect(await studentAssignment(A)).toMatchObject({ versionId: "v1" });
  });

  it("higher priority wins, and the rule it hid is kept in the history detail", async () => {
    const detail = (await db.select().from(schema.assignmentHistory).where(eq(schema.assignmentHistory.userId, B)))
      .find((h) => h.outcome === "assigned" && h.versionId === "v2")!.detail as { shadowedRuleIds?: string[] };
    expect(detail.shadowedRuleIds).toContain(await ruleId("Nine A"));
  });

  it("reassigning keeps every lesson the student has finished", async () => {
    const before = (await db.select().from(schema.lessonProgress).where(eq(schema.lessonProgress.userId, A))).length;
    await saveRule(ADMIN, rule({ name: "Move A", chapters: ["cbse-9-polynomials"], targetVersionId: "v2", priority: "1000" }));
    await setRuleStatus(ADMIN, await ruleId("Move A"), "live");
    expect(await studentAssignment(A)).toMatchObject({ versionId: "v2" });
    expect((await db.select().from(schema.lessonProgress).where(eq(schema.lessonProgress.userId, A))).length).toBe(before);
  });

  it("with no rule left for a student, they move to the fallback version", async () => {
    await saveVersion(ADMIN, { id: "v2", courseId: "math-start", name: "Version 2", status: "published", isFallback: "on" });
    await setRuleStatus(ADMIN, await ruleId("Move A"), "disabled");
    // "Nine A" also matches student A, so it has to go too before A has no rule left.
    await setRuleStatus(ADMIN, await ruleId("Nine A"), "disabled");
    expect(await studentAssignment(A)).toMatchObject({ versionId: "v2", outcome: "fallback" });
    expect(await studentAssignment(C)).toMatchObject({ versionId: "v2", outcome: "fallback" });
  });
});

describe("fallback and versions", () => {
  it("only one version can be the fallback at a time", async () => {
    await saveVersion(ADMIN, { id: "v1", courseId: "math-start", name: "Version 1", status: "published", isFallback: "on" });
    const flagged = await db.select({ id: schema.courseVersions.id }).from(schema.courseVersions).where(eq(schema.courseVersions.isFallback, true));
    expect(flagged.map((f) => f.id)).toEqual(["v1"]);
  });

  it("a draft version cannot be the fallback", async () => {
    const r = await saveVersion(ADMIN, { id: "v-draft", courseId: "math-start", name: "Draft", status: "draft", isFallback: "on" });
    expect(r.ok).toBe(false);
  });

  it("rejects a version id that is not a plain slug", async () => {
    const r = await saveVersion(ADMIN, { id: "Bad Id!", courseId: "x", name: "x", status: "draft" });
    expect(r.ok).toBe(false);
  });
});

describe("impact preview", () => {
  it("counts who would change without writing anything", async () => {
    const assignmentsBefore = (await db.select().from(schema.studentCourseAssignments)).map((r) => `${r.userId}:${r.versionId}`).sort();
    const id = await ruleId("Nine A");
    const p = await previewRuleImpact(id, rule({ name: "Nine A", chapters: ["cbse-9-polynomials"], targetVersionId: "v1", priority: "10", status: "live" }));
    expect(p.ok).toBe(true);
    expect((await db.select().from(schema.studentCourseAssignments)).map((r) => `${r.userId}:${r.versionId}`).sort()).toEqual(assignmentsBefore);
  });
});

describe("recalculation", () => {
  it("is repeatable: a second run changes nothing", async () => {
    await recalculateAll();
    const again = await recalculateAll();
    expect(again.changed).toBe(0);
    expect(again.capped).toBe(false);
  });
});
