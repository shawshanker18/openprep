// Test-session lifecycle against real Postgres (PGlite): routing, idempotent submit, deadlines, scoring.
import fs from "node:fs";
import path from "node:path";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, asc, eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { SKILLS } from "@/content/taxonomy";

vi.mock("@/server/delivery-context",()=>({deliveryContext:async()=>({ip:null,device:null})}));
const pg = new PGlite();
const queries: string[] = [];
const db = drizzle(pg, { schema, logger: { logQuery(query) { queries.push(query); } } });
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
  // 24 questions per math skill, half in each pool (12 test + 12 study), difficulty mix 1-3. Correct answer is always "A".
  const qs: schema.Question[] = [];
  for (const s of SKILLS.filter((k) => k.section === "math"))
    for (let i = 0; i < 24; i++)
      qs.push({ id: `${s.id}-${String(i).padStart(4, "0")}`, skillId: s.id, section: "math", domain: s.domain, difficulty: (i % 3) + 1,
        type: "mcq", passageMd: null, stemMd: "s", choices: [], answer: { choice: "A" }, explanationMd: "e", choiceRationales: null,
        fastMethodMd: null, desmos: null, tags: [], status: "active", version: 1, pool: i % 2 ? "test" : "study" });
  await db.insert(schema.questions).values(qs);
});

// Each case starts its own tests: age earlier ones so the start speed limit (4 per 5 minutes) applies per case.
beforeEach(async () => {
  await db.delete(schema.deliveryWindows).where(sql`id like 'test-start:%'`);
  await db.update(schema.testSessions).set({ startedAt: sql`${schema.testSessions.startedAt} - interval '10 minutes'` });
});

const modules = (sessionId: string) =>
  db.select().from(schema.testModules).where(eq(schema.testModules.sessionId, sessionId)).orderBy(asc(schema.testModules.idx));
const items = (moduleId: string) =>
  db.select().from(schema.testItems).where(eq(schema.testItems.moduleId, moduleId)).orderBy(asc(schema.testItems.position));

it("diagnostic review reveals answered questions only after completion and only to their owner", async () => {
  const diagUser = "00000000-0000-0000-0000-0000000000dc";
  await db.insert(schema.profiles).values({ id: diagUser });
  const [q] = await db.select().from(schema.questions).limit(1);
  const [session] = await db.insert(schema.testSessions).values({ userId: diagUser, kind: "diagnostic" }).returning();
  const [module] = await db.insert(schema.testModules).values({ sessionId: session!.id, idx: 0, section: "math", route: "base" }).returning();
  await db.insert(schema.testItems).values({ moduleId: module!.id, position: 0, questionId: q!.id, response: "B", timeMs: 30000 });
  await db.insert(schema.attempts).values({ userId: diagUser, questionId: q!.id, skillId: q!.skillId, context: "diagnostic", sessionId: session!.id, response: "B", correct: false, timeMs: 30000, thetaBefore: 0, thetaAfter: 0 });
  expect((await T.getTestResult(diagUser, session!.id))!.items).toEqual([]);
  expect(await T.getTestResult(OTHER, session!.id)).toBeNull();
  await db.update(schema.testSessions).set({ status: "completed", completedAt: new Date() }).where(eq(schema.testSessions.id, session!.id));
  const review = await T.getTestResult(diagUser, session!.id);
  expect(review!.items).toHaveLength(1);
  expect(review!.items[0]).toMatchObject({ response: "B", correct: false, question: { answer: { choice: "A" }, explanationMd: "e" } });
  expect(await T.getTestResult(OTHER, session!.id)).toBeNull();
});

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

  await db.update(schema.testModules).set({startedAt:new Date(Date.now()-10*60_000)});
  await T.submitModule(USER, m1!.id);
  await db.update(schema.testModules).set({startedAt:new Date(Date.now()-10*60_000)});
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
  await db.update(schema.testModules).set({startedAt:new Date(Date.now()-10*60_000)});
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
    choiceRationales: null, fastMethodMd: null, desmos: null, tags: [], status: "active", version: 1, pool: "test" as const,
  })));
  const r = await T.startTest(USER, { kind: "full" });
  if (!r.ok) throw new Error(r.error);
  const [rw1] = await modules(r.id);
  expect(rw1).toMatchObject({ section: "rw", route: "base" });
  expect(await items(rw1!.id)).toHaveLength(5); // the whole R&W bank
  await T.startModule(USER, rw1!.id);
  await db.update(schema.testModules).set({startedAt:new Date(Date.now()-10*60_000)});
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
  // A mini test is a skill drill, so its items are study-pool questions that practice could otherwise serve.
  const [first]=await db.select({questionId:schema.testItems.questionId}).from(schema.testItems)
    .where(eq(schema.testItems.moduleId,m!.id)).limit(1);
  expect(first).toBeDefined();
  expect(await T.inRunningTest(USER, first!.questionId)).toBe(true);
  await db.update(schema.questionServes).set({servedAt:new Date(Date.now()-6000)});
  expect(await P.submitAnswer(USER, { questionId: first!.questionId, response: "A", timeMs: 5000, confidence: 3 })).toBeNull();
  // ...and practice doesn't serve it at all (it would be stuck on a question it can't grade).
  expect(await P.nextQuestion(USER, {} as schema.Profile, { mode: "list", ids: [first!.questionId], exclude: [] })).toBeNull();
  await T.abandonTest(USER, r.id);
  // Once the test is over, practice can serve and reveal it as usual.
  await P.nextQuestion(USER, {} as schema.Profile, { mode: "list", ids: [first!.questionId], exclude: [] });
  await db.update(schema.questionServes).set({servedAt:new Date(Date.now()-6000)});
  expect(await P.submitAnswer(USER, { questionId: first!.questionId, response: "A", timeMs: 5000, confidence: 3 })).not.toBeNull();
});

it("server clock: reported time is capped by real elapsed time, and the sweep closes expired modules", async () => {
  const now = new Date("2026-10-02T10:00:00Z");
  expect(T.serverCappedTime(30_000, new Date(now.getTime() - 60_000), now)).toBe(30_000); // honest client
  expect(T.serverCappedTime(3_600_000, new Date(now.getTime() - 45_000), now)).toBe(45_000); // inflated claim
  expect(T.serverCappedTime(500_000_000, null, now)).toBe(600_000); // no server timestamp: 10 min cap

  const r = await T.startTest(USER, { kind: "module", section: "math" });
  if (!r.ok) throw new Error(r.error);
  const [m] = await modules(r.id);
  await T.startModule(USER, m!.id);
  // Claiming an hour right after the module started records only the real few seconds.
  await T.saveResponse(USER, { moduleId: m!.id, position: 0, response: "A", flagged: false, timeMsDelta: 3_600_000 });
  const [first] = await items(m!.id);
  expect(first!.timeMs).toBeLessThan(10_000);

  // Time runs out while the tab is closed: the sweep submits the module and finishes the test.
  await db.update(schema.testModules).set({ deadlineAt: new Date(Date.now() - 60_000) }).where(eq(schema.testModules.id, m!.id));
  const swept = await T.sweepTests();
  expect(swept.submitted).toBe(1);
  const [after] = await modules(r.id);
  expect(after!.submittedAt).not.toBeNull();
  const [s] = await db.select().from(schema.testSessions).where(eq(schema.testSessions.id, r.id));
  expect(s!.status).toBe("completed");
});

it("full mock freshness: false when a section doesn't have enough unseen questions", async () => {
  // The test bank has plenty of math but no Reading and Writing questions at all.
  expect(await T.freshFullMock(OTHER)).toBe(false);
});

it("test starts have a speed limit, not a quota", async () => {
  const U = "00000000-0000-0000-0000-0000000000cd";
  await db.insert(schema.profiles).values({ id: U });
  await db.insert(schema.skillState).values(SKILLS.map((k) => ({ userId: U, skillId: k.id })));
  const start = () => T.startTest(U, { kind: "module", section: "math" });
  for (let i = 0; i < 20; i++) { const r = await start(); expect(r.ok).toBe(true); if(r.ok) await T.abandonTest(U,r.id); }
  expect(await start()).toMatchObject({ ok: false, error: "rate" }); // rapid repeated starts are still bounded
  await db.update(schema.testSessions).set({ startedAt: sql`${schema.testSessions.startedAt} - interval '6 minutes'` }).where(eq(schema.testSessions.userId, U));
  await db.delete(schema.deliveryWindows).where(eq(schema.deliveryWindows.id,`test-start:user:${U}`)); // age the independent rolling bucket along with the session fixture
  expect((await start()).ok).toBe(true); // a few minutes later: fine, however many they did before
});


it("custom test selects multiple skills with one narrow metadata query", async () => {
  const skills = SKILLS.filter((s) => s.section === "math").slice(0, 2).map((s) => s.id);
  queries.length = 0;
  const result = await T.startTest(OTHER, { kind: "custom", skillIds: skills, count: 8, timed: false });
  if (!result.ok) throw new Error(result.error);
  const selection = queries.filter((query) => query.includes('from "questions" left join "attempts"'));
  expect(selection).toHaveLength(1);
  for (const field of ["stem_md", "passage_md", "choices", "answer", "explanation_md", "choice_rationales", "fast_method_md", "desmos"])
    expect(selection[0]).not.toContain(`"${field}"`);
  const [module] = await modules(result.id);
  const selected = await items(module!.id);
  expect(selected).toHaveLength(8);
  for (const skill of skills) expect(selected.filter((item) => item.questionId.startsWith(skill))).toHaveLength(4);
  await T.abandonTest(OTHER, result.id);
});
it('submits an early module and saves final drafts atomically, with safe retries and ownership checks',async()=>{
  const started=await T.startTest(USER,{kind:'module',section:'math'});
  if(!started.ok) throw new Error(started.error);
  const [module]=await modules(started.id);
  expect(await T.submitModule(USER,module!.id)).toBe(false);
  await T.startModule(USER,module!.id);
  const drafts=[{position:0,response:'A',flagged:true,timeMsDelta:200},{position:1,response:'B',flagged:false,timeMsDelta:200}];
  expect(await T.submitModule(OTHER,module!.id,drafts)).toBe(false);
  expect(await T.submitModule(USER,module!.id,[{...drafts[0]!,position:99}])).toBe(false);
  expect((await items(module!.id))[0]!.response).toBeNull();
  expect(await T.submitModule(USER,module!.id,drafts)).toEqual({finished:true});
  const saved=await items(module!.id);
  expect(saved[0]).toMatchObject({response:'A',flagged:true});
  expect(saved[1]).toMatchObject({response:'B'});
  expect(await T.submitModule(USER,module!.id,[{...drafts[0]!,response:'B'}])).toEqual({finished:true});
  expect((await items(module!.id))[0]!.response).toBe('A');
});
