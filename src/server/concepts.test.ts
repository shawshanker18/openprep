// Concepts end to end on real Postgres (PGlite, all migrations applied): what an admin may save, what a student sees.
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";

const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
vi.mock("@/server/admin", () => ({ audit: async () => {}, requireAdmin: async () => ({ adminId: ADMIN }) }));
vi.mock("@/server/delivery-context", () => ({ deliveryContext: async () => ({ ip: null, device: null }) }));
const started: unknown[] = [];
vi.mock("@/server/practice-sessions", () => ({
  createPracticeSession: async (_user: string, config: unknown) => { started.push(config); return "00000000-0000-4000-8000-0000000000aa"; },
}));

const { checkpointQuestions, conceptsForSkill, deleteConcept, saveConcept, startConceptPractice, startLessonTry } = await import("./concepts");

const ADMIN = "00000000-0000-4000-8000-00000000ad01";
const USER = "00000000-0000-4000-8000-00000000c001";
const SKILL = "m-alg-ineq";
const OTHER = "m-geo-trig";

const question = (id: string, skillId: string, status: "active" | "retired" = "active") => ({
  id, skillId, section: "math", domain: "alg", difficulty: 2, type: "mcq", stemMd: `Stem ${id}`,
  answer: { choice: "A" }, explanationMd: "Because.", status,
});

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values({ id: USER, chaptersDone: [] });
  await db.insert(schema.questions).values([
    question("q-active-1", SKILL), question("q-active-2", SKILL), question("q-retired", SKILL, "retired"), question("q-other", OTHER),
    { ...question("q-test-pool", SKILL), pool: "test" },
  ]);
}, 120_000);

const base = { skillId: SKILL, title: "Reading the sign", explanationMd: "Think about the boundary.", sort: 0 };

describe("saving a concept", () => {
  it("accepts active questions of its own skill", async () => {
    const r = await saveConcept(ADMIN, { ...base, questionIds: ["q-active-1", "q-active-2"] });
    expect(r).toMatchObject({ ok: true });
    const links = await db.select().from(schema.conceptQuestions).where(eq(schema.conceptQuestions.conceptId, (r as { value: { id: string } }).value.id));
    expect(links.map((l) => l.questionId).sort()).toEqual(["q-active-1", "q-active-2"]);
  });

  it("refuses retired questions and questions from another skill, and saves nothing", async () => {
    const before = await db.select().from(schema.skillConcepts);
    const retired = await saveConcept(ADMIN, { ...base, title: "Retired pick", questionIds: ["q-retired"] });
    const wrongSkill = await saveConcept(ADMIN, { ...base, title: "Wrong skill", questionIds: ["q-other"] });
    expect(retired.ok).toBe(false);
    expect(wrongSkill.ok).toBe(false);
    expect(await db.select().from(schema.skillConcepts)).toHaveLength(before.length);
  });

  it("refuses test-pool questions, which are reserved for mock tests", async () => {
    const r = await saveConcept(ADMIN, { ...base, title: "Test-pool pick", questionIds: ["q-test-pool"] });
    expect(r.ok).toBe(false);
  });

  it("refuses a title that is empty and a skill that does not exist", async () => {
    expect((await saveConcept(ADMIN, { ...base, title: "   " })).ok).toBe(false);
    expect((await saveConcept(ADMIN, { ...base, skillId: "nope" })).ok).toBe(false);
  });
});

describe("what a student sees", () => {
  it("counts only active questions for each concept", async () => {
    const [concept] = await conceptsForSkill(SKILL).then((rows) => rows.filter((r) => r.title === "Reading the sign"));
    expect(concept).toMatchObject({ title: "Reading the sign", questionCount: 2 });
  });

  it("starts a practice set of the concept's active questions only", async () => {
    started.length = 0;
    const concept = (await conceptsForSkill(SKILL)).find((r) => r.title === "Reading the sign")!;
    const sessionId = await startConceptPractice(USER, concept.id);
    expect(sessionId).toBeTruthy();
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ mode: "list", count: 2 });
    expect((started[0] as { ids: string[] }).ids).toHaveLength(2);
    // The two questions are recorded as delivered to this student, as any practice set does.
    const exposed = await db.select().from(schema.questionExposures).where(eq(schema.questionExposures.userId, USER));
    expect(exposed.map((e) => e.questionId).sort()).toEqual(["q-active-1", "q-active-2"]);
  });

  it("starts nothing for a concept with no active questions", async () => {
    const empty = await saveConcept(ADMIN, { ...base, title: "Empty concept", questionIds: [] });
    expect(empty.ok).toBe(true);
    const id = (empty as { value: { id: string } }).value.id;
    expect(await startConceptPractice(USER, id)).toBeNull();
  });
});

describe("deleting a concept", () => {
  it("removes the concept and its links, not the questions", async () => {
    const r = await saveConcept(ADMIN, { ...base, title: "To delete", questionIds: ["q-active-1"] });
    const id = (r as { value: { id: string } }).value.id;
    expect(await deleteConcept(ADMIN, id)).toMatchObject({ ok: true, value: { removed: true } });
    expect(await db.select().from(schema.conceptQuestions).where(eq(schema.conceptQuestions.conceptId, id))).toHaveLength(0);
    expect(await db.select().from(schema.questions).where(eq(schema.questions.id, "q-active-1"))).toHaveLength(1);
  });
});

describe("checkpoints", () => {
  it("starts with a concept question, uses only active study questions, and never repeats one", async () => {
    await saveConcept(ADMIN, { ...base, title: "Checkpoint concept", questionIds: ["q-active-2"] });
    const picks = await checkpointQuestions(SKILL);
    expect(picks[0]?.id).toBe("q-active-2");
    const ids = picks.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("q-retired");
    expect(ids).not.toContain("q-test-pool");
    expect(ids.length).toBeLessThanOrEqual(5);
  });
});

describe("try a question, from a lesson concept", () => {
  it("uses the admin concept with the same title, and the skill's questions when there is none", async () => {
    await saveConcept(ADMIN, { ...base, title: "Matching title", questionIds: ["q-active-1"] });
    started.length = 0;
    expect(await startLessonTry(USER, SKILL, "Matching title")).toBeTruthy();
    expect((started[0] as { ids: string[] }).ids).toHaveLength(1);
    started.length = 0;
    expect(await startLessonTry(USER, SKILL, "No such concept")).toBeTruthy();
    expect((started[0] as { ids: string[] }).ids.length).toBeGreaterThan(0);
    expect((started[0] as { ids: string[] }).ids.length).toBeLessThanOrEqual(3);
  });
});
