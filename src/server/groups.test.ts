// User groups and admin-made courses end to end on real Postgres (PGlite, all migrations applied).
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema";

const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
const EMAILS: Record<string, string> = { "ann@example.com": "00000000-0000-4000-8000-00000000c001", "bob@example.com": "00000000-0000-4000-8000-00000000c002" };
vi.mock("@/server/admin", () => ({
  audit: async () => {}, requireAdmin: async () => ({ adminId: ADMIN }),
  userDirectory: async (search: string) => Object.entries(EMAILS).filter(([e]) => e.includes(search)).map(([email, id]) => ({ id, email, createdAt: new Date(), lastSignInAt: null })),
}));

const { evaluateStudent, studentAssignments } = await import("./course-assignment");
const { saveRule, saveCourse, saveVersion, publishVersion } = await import("./assignment-admin");
const { saveGroup, deleteGroup, addMembers, removeMember, userIdsByEmail } = await import("./groups");
const { seedChapterCourses } = await import("./chapter-course-seed");

const ADMIN = "00000000-0000-4000-8000-00000000ad01";
const ANN = EMAILS["ann@example.com"]!;
const BOB = EMAILS["bob@example.com"]!;
const CY = "00000000-0000-4000-8000-00000000c003"; // not in any group
const routeOf = async (id: string, course: string) => (await studentAssignments(id)).find((a) => a.courseId === course)?.versionId;

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values([{ id: ANN, chaptersDone: [] }, { id: BOB, chaptersDone: [] }, { id: CY, chaptersDone: [] }]);
  await seedChapterCourses(db as never);
}, 120_000);

let groupId = "";

describe("making a course", () => {
  it("creates the course, its skills, a published default version, a draft covered version and a draft rule", async () => {
    const r = await saveCourse(ADMIN, { id: "linear-inequalities", title: "Linear Inequalities", chapterId: "cbse-11-linear-inequalities", skills: ["m-alg-ineq"] });
    expect(r).toMatchObject({ ok: true, value: { created: true } });
    const versions = await db.select().from(schema.courseVersions).where(eq(schema.courseVersions.courseId, "linear-inequalities"));
    expect(versions.map((v) => `${v.id}:${v.status}:${v.isFallback}`).sort()).toEqual(["linear-inequalities-covered:draft:false", "linear-inequalities-default:published:true"]);
    const rules = await db.select().from(schema.assignmentRules).where(eq(schema.assignmentRules.targetVersionId, "linear-inequalities-covered"));
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ status: "draft", condition: { all: [{ chapter: "cbse-11-linear-inequalities" }] } });
  });

  it("students can then be routed by the new course once it is published", async () => {
    await db.update(schema.profiles).set({ chaptersDone: ["cbse-11-linear-inequalities"] }).where(eq(schema.profiles.id, CY));
    await publishVersion(ADMIN, "linear-inequalities-covered");
    expect(await routeOf(CY, "linear-inequalities")).toBe("linear-inequalities-covered");
    expect(await routeOf(ANN, "linear-inequalities")).toBe("linear-inequalities-default");
  });

  it("reports every form problem together", async () => {
    const r = await saveCourse(ADMIN, { id: "Bad Id", title: "", skills: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.length).toBeGreaterThanOrEqual(2);
  });

  it("refuses a skill another course owns, an unknown chapter and an unknown skill", async () => {
    const r = await saveCourse(ADMIN, { id: "extra", title: "Extra", chapterId: "cbse-11-nope", skills: ["m-geo-trig", "m-nope"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.map((p) => p.message).join(" | ")).toMatch(/Unknown chapter[\s\S]*Unknown skill m-nope[\s\S]*already belongs to the course trig-functions/);
    expect(await db.select().from(schema.courses).where(eq(schema.courses.id, "extra"))).toHaveLength(0);
  });

  it("editing a course can change its title and skills, but not drop a skill that has customised lessons", async () => {
    const edit = (skills: string[]) => saveCourse(ADMIN, { id: "straight-lines", title: "Straight Lines", chapterId: "cbse-11-straight-lines", skills });
    const blocked = await edit(["m-alg-linfunc"]);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.problems[0]!.message).toMatch(/customised lessons/);
    await db.delete(schema.courseVersionLessons).where(eq(schema.courseVersionLessons.skillId, "m-alg-lin2"));
    expect(await edit(["m-alg-linfunc"])).toMatchObject({ ok: true, value: { created: false } });
    expect((await db.select().from(schema.courseSkills).where(eq(schema.courseSkills.courseId, "straight-lines"))).map((r) => r.skillId)).toEqual(["m-alg-linfunc"]);
    // the freed skill can now belong to another course
    expect(await saveCourse(ADMIN, { id: "extra", title: "Extra", skills: ["m-alg-lin2"] })).toMatchObject({ ok: true, value: { created: true } });
  });

  it("a version cannot be saved for a course that does not exist", async () => {
    expect((await saveVersion(ADMIN, { id: "ghost-v1", courseId: "ghost", name: "Ghost", status: "draft" })).ok).toBe(false);
  });
});

describe("user groups", () => {
  it("creates a group and refuses a second with the same name in any case", async () => {
    const r = await saveGroup(ADMIN, { name: "Class 11-A", description: "pilot" });
    expect(r.ok).toBe(true);
    if (r.ok) groupId = r.value.id;
    expect((await saveGroup(ADMIN, { name: "class 11-a" })).ok).toBe(false);
  });

  it("turns pasted emails into ids and reports the ones it cannot find", async () => {
    const r = await userIdsByEmail("Ann@Example.com, bob@example.com\nnobody@example.com");
    expect(r.ids.sort()).toEqual([ANN, BOB]);
    expect(r.missing).toEqual(["nobody@example.com"]);
  });

  it("adds members once, skipping unknown ids and repeats", async () => {
    const r = await addMembers(ADMIN, groupId, [ANN, ANN, "00000000-0000-4000-8000-0000000000ff"]);
    expect(r).toMatchObject({ ok: true, value: { added: 1, skipped: 1 } });
    expect(await addMembers(ADMIN, groupId, [ANN])).toMatchObject({ ok: true, value: { added: 0 } });
  });
});

describe("a rule limited to a group", () => {
  let ruleId = "";
  it("needs a group or chapters, and the group must exist", async () => {
    const base = { name: "Pilot trig", status: "draft", priority: "50", targetVersionId: "trig-functions-covered", op: "all", chapters: [] as string[] };
    expect((await saveRule(ADMIN, base)).ok).toBe(false);
    expect((await saveRule(ADMIN, { ...base, groupId: "00000000-0000-4000-8000-0000000000aa" })).ok).toBe(false);
    const ok = await saveRule(ADMIN, { ...base, groupId });
    expect(ok.ok).toBe(true);
    if (ok.ok) ruleId = ok.value.id;
  });

  it("once live, gives the covered course to group members only, whatever chapters they finished", async () => {
    await publishVersion(ADMIN, "trig-functions-covered");
    expect(await routeOf(ANN, "trig-functions")).toBe("trig-functions-covered");
    expect(await routeOf(BOB, "trig-functions")).toBe("trig-functions-default");
    expect(await routeOf(CY, "trig-functions")).toBe("trig-functions-default");
  });

  it("adding a student to the group moves them at once, and removing moves them back", async () => {
    await addMembers(ADMIN, groupId, [BOB]);
    expect(await routeOf(BOB, "trig-functions")).toBe("trig-functions-covered");
    await removeMember(ADMIN, groupId, BOB);
    expect(await routeOf(BOB, "trig-functions")).toBe("trig-functions-default");
  });

  it("only affects the course the rule targets", async () => {
    expect(await routeOf(ANN, "straight-lines")).not.toBe("straight-lines-covered");
    const { results } = await evaluateStudent(ANN);
    expect(Object.keys(results)).toEqual(expect.arrayContaining(["trig-functions", "straight-lines"]));
  });

  it("a group a rule uses cannot be deleted, and a rule's group survives (no silent widening)", async () => {
    const r = await deleteGroup(ADMIN, groupId);
    expect(r.ok).toBe(false);
    const [rule] = await db.select().from(schema.assignmentRules).where(eq(schema.assignmentRules.id, ruleId));
    expect(rule!.groupId).toBe(groupId);
  });

  it("once no rule uses it, the group can be deleted along with its memberships", async () => {
    await db.delete(schema.assignmentRules).where(eq(schema.assignmentRules.id, ruleId));
    expect((await deleteGroup(ADMIN, groupId)).ok).toBe(true);
    expect(await db.select().from(schema.userGroupMembers).where(and(eq(schema.userGroupMembers.groupId, groupId)))).toHaveLength(0);
  });
});
