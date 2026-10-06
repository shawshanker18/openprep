// recordAttempt against real Postgres (PGlite, in-process) using the committed migration.
import fs from "node:fs";
import path from "node:path";
import { beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Tx } from "@/db";
import { recordAttempt } from "./attempts";

const pg = new PGlite();
const queries:string[]=[];
const db = drizzle(pg, { schema,logger:{logQuery(query){queries.push(query);}} });
const USER = "00000000-0000-0000-0000-000000000001";
const now = new Date("2026-10-01T10:00:00Z");

const q = (id: string, difficulty: number, answer: string): schema.Question => ({
  id, skillId: "m-adv-nonlin-eq", section: "math", domain: "m-adv", difficulty, type: "mcq", passageMd: null,
  stemMd: "s", choices: [], answer: { choice: answer }, explanationMd: "e", choiceRationales: null,
  fastMethodMd: null, desmos: null, tags: [], status: "active", version: 1,
});
const Q1 = q("m-adv-nonlin-eq-0001", 2, "B");
const Q2 = q("m-adv-nonlin-eq-0002", 2, "C");

const record = (question: schema.Question, a: Parameters<typeof recordAttempt>[3]) =>
  db.transaction((tx) => recordAttempt(tx as unknown as Tx, USER, question, a));
const state = async (skillId: string) =>
  (await db.select().from(schema.skillState).where(and(eq(schema.skillState.userId, USER), eq(schema.skillState.skillId, skillId))))[0]!;
const review = async (questionId: string) =>
  (await db.select().from(schema.reviewItems).where(eq(schema.reviewItems.questionId, questionId)))[0];

beforeAll(async () => {
  // Apply every migration in order (skip 0001: it needs Supabase's auth schema).
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values({ id: USER });
  await db.insert(schema.questions).values([Q1, Q2]);
  await db.insert(schema.skillState).values(
    ["m-adv-equiv", "m-adv-nonlin-eq", "m-adv-nonlin-func"].map((skillId) => ({ userId: USER, skillId })),
  );
});

it("correct answer raises theta, logs the attempt, shares with thin siblings", async () => {
  const r = await record(Q1, { response: "B", timeMs: 60_000, confidence: 3, context: "practice", now });
  expect(r.correct).toBe(true);
  expect(r.thetaAfter).toBeCloseTo(0.375, 3);
  const own = await state("m-adv-nonlin-eq");
  expect(own).toMatchObject({ n: 1, nCorrect: 1, totalTimeMs: 60_000 });
  expect((await state("m-adv-equiv")).theta).toBeCloseTo(0.1875, 3); // half the delta
  expect((await state("m-adv-equiv")).n).toBe(0);                    // siblings get no attempt count
  expect(await review(Q1.id)).toBeUndefined();
});

it("sure-but-wrong queues a review in 4 hours with a guessed mistake type", async () => {
  const r = await record(Q2, { response: "A", timeMs: 60_000, confidence: 3, context: "practice", now });
  expect(r.correct).toBe(false);
  expect(r.thetaAfter).toBeLessThan(r.thetaBefore);
  expect(r.mistakeType).toBe("concept");
  expect((await review(Q2.id))!.dueAt).toEqual(new Date("2026-10-01T14:00:00Z"));
});

it("review answers walk the 1/3/7-day ladder at half weight, then leave the queue", async () => {
  const before = (await state("m-adv-nonlin-eq")).theta;
  const r = await record(Q2, { response: "C", timeMs: 30_000, confidence: 2, context: "review", now });
  expect(r.thetaAfter - before).toBeGreaterThan(0);
  expect((await review(Q2.id))!.stage).toBe(1);
  await record(Q2, { response: "C", timeMs: 30_000, confidence: 3, context: "review", now });
  expect((await review(Q2.id))!.stage).toBe(2);
  await record(Q2, { response: "C", timeMs: 30_000, confidence: 3, context: "review", now });
  expect(await review(Q2.id)).toBeUndefined();
});

it("omitted test answers are wrong, typed as timing, and time is capped", async () => {
  const r = await record(Q1, { response: null, timeMs: 99 * 60_000, confidence: null, context: "test", now });
  expect(r).toMatchObject({ correct: false, mistakeType: "timing" });
  const [att] = await db.select().from(schema.attempts).where(eq(schema.attempts.id, r.attemptId));
  expect(att!.timeMs).toBe(10 * 60_000);
});

it("refuses when onboarding never created skill rows", async () => {
  const other = { ...Q1, skillId: "m-alg-lin1", domain: "m-alg" };
  await expect(record(other, { response: "B", timeMs: 1, confidence: 3, context: "practice", now })).rejects.toThrow(/skill_state missing/);
});

it("guessed-right is queued for review in 3 days, and a guessed-right review stays at stage 0", async () => {
  const Q3 = q("m-adv-nonlin-eq-0003", 2, "D");
  await db.insert(schema.questions).values(Q3);
  const r = await record(Q3, { response: "D", timeMs: 30_000, confidence: 1, context: "practice", now });
  expect(r.correct).toBe(true);
  expect(await review(Q3.id)).toMatchObject({ stage: 0, dueAt: new Date("2026-10-04T10:00:00Z") });
  await record(Q3, { response: "D", timeMs: 30_000, confidence: 1, context: "review", now });
  expect((await review(Q3.id))!.stage).toBe(0);
  await record(Q3, { response: "D", timeMs: 30_000, confidence: 3, context: "review", now });
  expect((await review(Q3.id))!.stage).toBe(1); // a sure answer walks the ladder as before
});

it("batches sibling updates, clamps theta, and preserves established skills and other accounts",async()=>{
 const other="00000000-0000-0000-0000-000000000002";
 await db.insert(schema.profiles).values({id:other});
 await db.insert(schema.skillState).values({userId:other,skillId:"m-adv-equiv",theta:1});
 await db.update(schema.skillState).set({theta:2.99,n:0}).where(and(eq(schema.skillState.userId,USER),eq(schema.skillState.skillId,"m-adv-equiv")));
 await db.update(schema.skillState).set({theta:1,n:3}).where(and(eq(schema.skillState.userId,USER),eq(schema.skillState.skillId,"m-adv-nonlin-func")));
 queries.length=0;
 await record(Q1,{response:"B",timeMs:5000,confidence:3,context:"practice",now});
 expect(queries.filter(q=>q.startsWith('update "skill_state"'))).toHaveLength(2);
 expect((await state("m-adv-equiv")).theta).toBe(3);
 expect((await state("m-adv-nonlin-func")).theta).toBe(1);
 const [otherState]=await db.select().from(schema.skillState).where(eq(schema.skillState.userId,other));
 expect(otherState!.theta).toBe(1);
});
