// Test-session lifecycle against real Postgres (PGlite): routing, idempotent submit, deadlines, scoring.
import fs from "node:fs";
import path from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, asc, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { SKILLS } from "@/content/taxonomy";

const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
const T = await import("./tests");

const USER = "00000000-0000-0000-0000-0000000000aa";
const OTHER = "00000000-0000-0000-0000-0000000000bb";

beforeAll(async () => {
  // Apply every migration in order (skip 0001: it needs Supabase's auth schema).
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values([{ id: USER }, { id: OTHER }]);
  await db.insert(schema.skillState).values(SKILLS.map((s) => ({ userId: USER, skillId: s.id })));
  // 12 questions per math skill × difficulty mix → plenty for two math modules. Correct answer is always "A".
  const qs: schema.Question[] = [];
  for (const s of SKILLS.filter((k) => k.section === "math"))
    for (let i = 0; i < 12; i++)
      qs.push({ id: `${s.id}-${String(i).padStart(4, "0")}`, skillId: s.id, section: "math", domain: s.domain, difficulty: (i % 3) + 1,
        type: "mcq", passageMd: null, stemMd: "s", choices: [], answer: { choice: "A" }, explanationMd: "e", choiceRationales: null,
        fastMethodMd: null, desmos: null, tags: [], status: "active", version: 1 });
  await db.insert(schema.questions).values(qs);
});

const modules = (sessionId: string) =>
  db.select().from(schema.testModules).where(eq(schema.testModules.sessionId, sessionId)).orderBy(asc(schema.testModules.idx));
const items = (moduleId: string) =>
  db.select().from(schema.testItems).where(eq(schema.testItems.moduleId, moduleId)).orderBy(asc(schema.testItems.position));

it("section test: routes to the hard module, submits idempotently, scores, and updates mastery once", async () => {
  const r = await T.startTest(USER, { kind: "section", section: "math" });
  if (!r.ok) throw new Error(r.error);
  const [m1] = await modules(r.id);
  expect(m1).toMatchObject({ section: "math", route: "base", timeLimitS: 35 * 60 });
  const its = await items(m1!.id);
  expect(its).toHaveLength(22);

  // Answers are rejected before the module starts.
  expect((await T.saveResponse(USER, { moduleId: m1!.id, position: 0, response: "A", flagged: false, timeMsDelta: 1 })).ok).toBe(false);
  expect(await T.startModule(USER, m1!.id)).toBe(true);
  for (const it of its) await T.saveResponse(USER, { moduleId: m1!.id, position: it.position, response: "A", flagged: false, timeMsDelta: 60_000 });

  // Another user can't touch this module.
  expect((await T.saveResponse(OTHER, { moduleId: m1!.id, position: 0, response: "B", flagged: false, timeMsDelta: 1 })).ok).toBe(false);

  await T.submitModule(USER, m1!.id);
  await T.submitModule(USER, m1!.id); // double submit: no-op
  const mods = await modules(r.id);
  expect(mods).toHaveLength(2);
  expect(mods[1]).toMatchObject({ route: "hard", idx: 1 });
  const used1 = new Set(its.map((i) => i.questionId));
  expect((await items(mods[1]!.id)).some((i) => used1.has(i.questionId))).toBe(false); // no repeats across modules

  // No attempts (no mastery change) until the whole session completes.
  const pre = await db.select().from(schema.attempts).where(eq(schema.attempts.userId, USER));
  expect(pre).toHaveLength(0);

  await T.startModule(USER, mods[1]!.id);
  await T.submitModule(USER, mods[1]!.id); // all blank in module 2
  const [s] = await db.select().from(schema.testSessions).where(eq(schema.testSessions.id, r.id));
  expect(s!.status).toBe("completed");
  const res = s!.result as { sections: { math: { correct: number; total: number; route: string; score: number } }; insights: string[] };
  expect(res.sections.math).toMatchObject({ correct: 22, total: 44, route: "hard", score: 500 });
  expect(res.insights[0]).toMatch(/ran out of time on 22/);
  const att = await db.select().from(schema.attempts).where(and(eq(schema.attempts.userId, USER), eq(schema.attempts.sessionId, r.id)));
  expect(att).toHaveLength(44);

  const result = await T.getTestResult(USER, r.id);
  expect(result!.items).toHaveLength(44);
  expect(result!.items[0]!.question).toHaveProperty("answer"); // revealed only now
  expect(await T.getTestResult(OTHER, r.id)).toBeNull();
});

it("refuses a second full/section test while one is in progress, and abandon discards it", async () => {
  const a = await T.startTest(USER, { kind: "section", section: "math" });
  if (!a.ok) throw new Error(a.error);
  const b = await T.startTest(USER, { kind: "full" });
  expect(b).toMatchObject({ ok: false, resumeId: a.id });
  await T.abandonTest(USER, a.id);
  const [s] = await db.select().from(schema.testSessions).where(eq(schema.testSessions.id, a.id));
  expect(s!.status).toBe("abandoned");
  expect(await db.select().from(schema.attempts).where(eq(schema.attempts.sessionId, a.id))).toHaveLength(0);
});

it("a closed tab past the deadline is auto-submitted on the next load; late saves are rejected", async () => {
  const r = await T.startTest(USER, { kind: "module", section: "math" });
  if (!r.ok) throw new Error(r.error);
  const [m] = await modules(r.id);
  await T.startModule(USER, m!.id);
  await db.update(schema.testModules).set({ deadlineAt: new Date(Date.now() - 60_000) }).where(eq(schema.testModules.id, m!.id));
  expect((await T.saveResponse(USER, { moduleId: m!.id, position: 0, response: "A", flagged: false, timeMsDelta: 1 })).ok).toBe(false);
  const state = await T.getTestState(USER, r.id);
  expect(state).toMatchObject({ kind: "finished", status: "completed" });
  const [s] = await db.select().from(schema.testSessions).where(eq(schema.testSessions.id, r.id));
  expect((s!.result as { sections: { math: { score: number | null } } }).sections.math.score).toBeNull(); // single module: raw only
});

it("full test on a thin bank: an empty routed R&W module is skipped and Math still runs", async () => {
  await db.insert(schema.questions).values(Array.from({ length: 5 }, (_, i) => ({
    id: `rw-ei-transitions-${String(i).padStart(4, "0")}`, skillId: "rw-ei-transitions", section: "rw", domain: "rw-ei",
    difficulty: (i % 3) + 1, type: "mcq", passageMd: "p", stemMd: "s", choices: [], answer: { choice: "A" }, explanationMd: "e",
    choiceRationales: null, fastMethodMd: null, desmos: null, tags: [], status: "active", version: 1,
  })));
  const r = await T.startTest(USER, { kind: "full" });
  if (!r.ok) throw new Error(r.error);
  const [rw1] = await modules(r.id);
  expect(rw1).toMatchObject({ section: "rw", route: "base" });
  expect(await items(rw1!.id)).toHaveLength(5); // the whole R&W bank
  await T.startModule(USER, rw1!.id);
  await T.submitModule(USER, rw1!.id);
  const mods = await modules(r.id);
  expect(mods).toHaveLength(2);
  expect(mods[1]).toMatchObject({ section: "math", route: "base" }); // not finished early
  await T.abandonTest(USER, r.id);
});

it("mini test for a skill with no questions fails cleanly", async () => {
  expect(await T.startTest(USER, { kind: "mini", skillId: "rw-ii-central" })).toMatchObject({ ok: false });
});

it("custom test honours sub-topics and difficulty, topping up from the skill when the tag pool is thin", async () => {
  await db.insert(schema.questions).values(Array.from({ length: 2 }, (_, i) => ({
    id: `m-geo-circles-tag-${i}`, skillId: "m-geo-circles", section: "math", domain: "m-geo", difficulty: 1, type: "mcq",
    passageMd: null, stemMd: "s", choices: [], answer: { choice: "A" }, explanationMd: "e", choiceRationales: null,
    fastMethodMd: null, desmos: null, tags: ["arc-length"], status: "active", version: 1,
  })));
  const r = await T.startTest(USER, { kind: "custom", skillIds: ["m-geo-circles"], count: 6, timed: false, tags: ["arc-length"], difficulty: 3 });
  if (!r.ok) throw new Error(r.error);
  const [m] = await modules(r.id);
  const ids = (await items(m!.id)).map((i) => i.questionId);
  expect(ids).toHaveLength(6);
  expect(ids.filter((id) => id.startsWith("m-geo-circles-tag-"))).toHaveLength(2); // every tagged question, even off-difficulty
  const rest = await db.select().from(schema.questions);
  expect(rest.filter((x) => ids.includes(x.id) && !x.tags.length).every((x) => x.difficulty === 3)).toBe(true);
  const [s] = await db.select().from(schema.testSessions).where(eq(schema.testSessions.id, r.id));
  expect(s!.config).toMatchObject({ skillIds: ["m-geo-circles"], tags: ["arc-length"], difficulty: 3, timed: false });
  await T.abandonTest(USER, r.id);
});

it("a question in a live test can't be answered (and revealed) through practice", async () => {
  const P = await import("./practice");
  const r = await T.startTest(USER, { kind: "mini", skillId: SKILLS.find((s) => s.section === "math")!.id });
  if (!r.ok) throw new Error(r.error);
  const [m] = await modules(r.id);
  const [first] = await items(m!.id);
  expect(await T.inRunningTest(USER, first!.questionId)).toBe(true);
  expect(await P.submitAnswer(USER, { questionId: first!.questionId, response: "A", timeMs: 5000, confidence: 3 })).toBeNull();
  await T.abandonTest(USER, r.id);
  expect(await P.submitAnswer(USER, { questionId: first!.questionId, response: "A", timeMs: 5000, confidence: 3 })).not.toBeNull();
});
