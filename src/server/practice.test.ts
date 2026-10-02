// Question bank and list-mode practice against real Postgres (PGlite).
import fs from "node:fs";
import path from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";
import { SKILLS } from "@/content/taxonomy";

const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
const P = await import("./practice");
const Q = await import("./questions");

const USER = "00000000-0000-0000-0000-0000000000cc";
const skill = SKILLS.find((k) => k.section === "math")!;
const ids = ["qa", "qb", "qc"].map((x) => `${skill.id}-${x}`);

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values({ id: USER });
  await db.insert(schema.skillState).values(SKILLS.map((s) => ({ userId: USER, skillId: s.id })));
  await db.insert(schema.questions).values(ids.map((id) => ({ id, skillId: skill.id, section: "math" as const, domain: skill.domain, difficulty: 2,
    type: "mcq" as const, passageMd: null, stemMd: "s", choices: [], answer: { choice: "A" }, explanationMd: "e", choiceRationales: null,
    fastMethodMd: null, desmos: null, tags: [], status: "active" as const, version: 1 })));
});

it("list mode walks the given ids in order, and the bank shows last result and saved flag", async () => {
  const profile = {} as schema.Profile; // list mode never reads the profile
  const order = [ids[1]!, ids[0]!];
  const first = await P.nextQuestion(USER, profile, { mode: "list", ids: order, exclude: [] });
  expect(first?.question.id).toBe(Q.publicId(ids[1]!));
  await P.submitAnswer(USER, { questionId: ids[1]!, response: "A", timeMs: 5000, confidence: 2 });
  expect((await P.nextQuestion(USER, profile, { mode: "list", ids: order, exclude: [ids[1]!] }))?.question.id).toBe(Q.publicId(ids[0]!));
  expect(await P.nextQuestion(USER, profile, { mode: "list", ids: order, exclude: order })).toBeNull();

  await db.insert(schema.bookmarks).values({ userId: USER, questionId: ids[2]! });
  const bank = Object.fromEntries((await P.questionBank(USER)).map((q) => [q.id, q]));
  expect(bank[ids[1]!]).toMatchObject({ status: "correct", saved: false });
  expect(bank[ids[0]!]).toMatchObject({ status: "new", saved: false });
  expect(bank[ids[2]!]).toMatchObject({ status: "new", saved: true });
});

it("stops handing out questions once an account pulls too many too fast", async () => {
  const U2 = "00000000-0000-0000-0000-0000000000dd";
  await db.insert(schema.profiles).values({ id: U2 });
  const many = Array.from({ length: P.SPEED_LIMIT.max }, (_, i) => `${skill.id}-bulk${i}`);
  await db.insert(schema.questions).values(many.map((id) => ({ id, skillId: skill.id, section: "math" as const, domain: skill.domain, difficulty: 2,
    type: "mcq" as const, passageMd: null, stemMd: "s", choices: [], answer: { choice: "A" }, explanationMd: "e", choiceRationales: null,
    fastMethodMd: null, desmos: null, tags: [], status: "active" as const, version: 1 })));
  const now = new Date();
  await db.insert(schema.questionServes).values(many.slice(0, -1).map((questionId) => ({ userId: U2, questionId, servedAt: now })));
  expect(await P.tooFast(U2, now)).toBe(false);
  await db.insert(schema.questionServes).values({ userId: U2, questionId: many.at(-1)!, servedAt: now });
  expect(await P.tooFast(U2, now)).toBe(true);
  // A minute later they can carry on: it's a speed limit, not a quota.
  expect(await P.tooFast(U2, new Date(now.getTime() + 60_001))).toBe(false);
});

it("plan blocks are done only from real work today (a click can't tick them)", async () => {
  const D = await import("./daily");
  const U3 = "00000000-0000-0000-0000-0000000000ee";
  await db.insert(schema.profiles).values({ id: U3 });
  await db.insert(schema.skillState).values(SKILLS.map((s) => ({ userId: U3, skillId: s.id })));
  const profile = { timezone: "UTC" } as schema.Profile;
  const today = new Date().toISOString().slice(0, 10);
  const blocks = [
    { kind: "practice", minutes: 5, skillId: skill.id, done: true },  // a stored "done" is ignored
    { kind: "mini", minutes: 5, skillId: skill.id, done: false },     // same skill: must not reuse the same answers
    { kind: "review", minutes: 5, done: false },
    { kind: "learn", minutes: 10, skillId: skill.id, done: false },
    { kind: "desmos", minutes: 10, lessonSlug: "graphing-basics", done: false },
  ] as const;

  const before = await D.withProgress(U3, profile, today, [...blocks]);
  expect(before.map((b) => b.done)).toEqual([false, false, false, false, false]);
  expect(before[0]!.progress).toEqual({ n: 0, target: 3 }); // 5 minutes of math ≈ 3 questions

  const four = [...ids, `${skill.id}-bulk0`];
  await db.insert(schema.questionServes).values(four.map((questionId) => ({ userId: U3, questionId, servedAt: new Date() })));
  for (const q of four) await P.submitAnswer(U3, { questionId: q, response: "A", timeMs: 30_000, confidence: 2 });
  await db.insert(schema.lessonProgress).values([
    { userId: U3, skillId: skill.id },                                                                   // read today
    { userId: U3, skillId: "desmos:graphing-basics", completedAt: new Date(Date.now() - 2 * 86_400_000) }, // read days ago
  ]);
  const after = await D.withProgress(U3, profile, today, [...blocks]);
  expect(after.map((b) => b.done)).toEqual([true, false, false, true, false]);
  expect(after[1]!.progress).toEqual({ n: 1, target: 3 }); // 4 answers: 3 finish the first block, 1 left for the check-in
});

it("answers are only revealed for questions this student was given (no reading the bank by id)", async () => {
  const U4 = "00000000-0000-0000-0000-0000000000ff";
  await db.insert(schema.profiles).values({ id: U4 });
  await db.insert(schema.skillState).values(SKILLS.map((s) => ({ userId: U4, skillId: s.id })));
  const never = `${skill.id}-bulk7`;
  expect(await P.wasGiven(U4, never)).toBe(false);
  expect(await P.submitAnswer(U4, { questionId: never, response: "A", timeMs: 5000, confidence: 2 })).toBeNull();

  const served = await P.nextQuestion(U4, {} as schema.Profile, { mode: "list", ids: [never], exclude: [] });
  expect(served?.question.id).toBe(Q.publicId(never));
  expect(await P.wasGiven(U4, never)).toBe(true);
  const r = await P.submitAnswer(U4, { questionId: never, response: "A", timeMs: 5000, confidence: 2 });
  expect(r?.revealed.answer).toEqual({ choice: "A" });

  // One answer per serve: trying again (B, C, ...) is refused until the question is served again.
  expect(await P.submitAnswer(U4, { questionId: never, response: "B", timeMs: 5000, confidence: 2 })).toBeNull();
  await new Promise((r) => setTimeout(r, 5));
  await P.nextQuestion(U4, {} as schema.Profile, { mode: "list", ids: [never], exclude: [] });
  expect(await P.submitAnswer(U4, { questionId: never, response: "B", timeMs: 5000, confidence: 2 })).not.toBeNull();
});

it("question ids sent to the browser are opaque and map back only through the server", async () => {
  const Q2 = await import("./questions");
  const pub = Q2.publicId(ids[0]!);
  expect(pub).toMatch(/^[\w-]{22}$/);
  expect(pub).not.toContain(skill.id); // nothing about the skill or numbering leaks
  expect(await Q2.internalId(pub)).toBe(ids[0]);
  expect(await Q2.internalId(ids[0]!)).toBeNull(); // the internal id itself is not accepted from the browser
  expect(await Q2.internalId("A".repeat(22))).toBeNull(); // a guess maps to nothing
  const q = (await P.nextQuestion(USER, {} as schema.Profile, { mode: "list", ids: [ids[2]!], exclude: [] }))!.question;
  expect(JSON.stringify(q)).not.toMatch(/answer|explanation|difficulty|choiceRationales/);
});
