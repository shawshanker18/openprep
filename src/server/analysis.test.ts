// Analysis aggregation against real Postgres (PGlite, in-process) using the committed migrations.
import fs from "node:fs";
import path from "node:path";
import { beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";
import { bucketsFor } from "./analysis";
import { summarize } from "@/engine/analysis";

const pg = new PGlite();
const db = drizzle(pg, { schema });
const USER = "00000000-0000-0000-0000-0000000000a1";
const OTHER = "00000000-0000-0000-0000-0000000000a2";
const NOW = new Date("2026-10-10T12:00:00Z");
const OLD = new Date("2026-08-01T12:00:00Z");

const question = (id: string, difficulty: number): schema.Question => ({
  id, skillId: "m-alg-lin1", section: "math", domain: "m-alg", difficulty, type: "mcq", passageMd: null,
  stemMd: "s", choices: [], answer: { choice: "A" }, explanationMd: "e", choiceRationales: null,
  fastMethodMd: null, desmos: null, tags: [], status: "active", version: 1, pool: "study",
});

const attempt = (over: Partial<typeof schema.attempts.$inferInsert> & { questionId: string }) => ({
  userId: USER, skillId: "m-alg-lin1", context: "practice", response: "A", correct: true, timeMs: 30_000,
  thetaBefore: 0, thetaAfter: 0, createdAt: NOW, ...over,
});

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values([{ id: USER }, { id: OTHER }]);
  await db.insert(schema.questions).values([question("q-easy", 1), question("q-hard", 3)]);
  await db.insert(schema.attempts).values([
    attempt({ questionId: "q-easy", correct: true, timeMs: 20_000 }),                       // valid
    attempt({ questionId: "q-easy", correct: false, response: "B", timeMs: 40_000 }),        // valid, wrong
    attempt({ questionId: "q-hard", correct: false, response: null, timeMs: 0 }),           // unanswered: not eligible
    attempt({ questionId: "q-hard", correct: false, response: "C", timeMs: 600_000 }),      // clamped at the cap: no timing
    attempt({ questionId: "q-hard", correct: true, response: "A", timeMs: 500 }),           // accidental tap: no timing
    attempt({ questionId: "q-hard", correct: true, response: "A", timeMs: 60_000, createdAt: OLD }), // outside 30 days
    attempt({ questionId: "q-hard", correct: true, response: "A", timeMs: 90_000, userId: OTHER }),  // someone else
  ]);
}, 120_000); // applying every migration to PGlite takes longer than the 10s default

it("groups answered attempts by skill and difficulty, excluding unanswered and other students", async () => {
  const since = new Date(NOW.getTime() - 30 * 86_400_000);
  const buckets = await bucketsFor(db as never, USER, since);
  const easy = buckets.find((b) => b.difficulty === 1)!;
  const hard = buckets.find((b) => b.difficulty === 3)!;
  expect(easy).toEqual({ skillId: "m-alg-lin1", difficulty: 1, answered: 2, correct: 1, timedN: 2, timedMs: 60_000 });
  // Hard, last 30 days: the unanswered row and the old row are out; the capped row and the tap are answered but untimed.
  expect(hard).toEqual({ skillId: "m-alg-lin1", difficulty: 3, answered: 2, correct: 1, timedN: 0, timedMs: 0 });
});

it("respects the date range and returns nothing for a student with no attempts", async () => {
  const all = await bucketsFor(db as never, USER, null);
  expect(summarize(all).answered).toBe(5);
  const windowed = await bucketsFor(db as never, USER, new Date(NOW.getTime() - 30 * 86_400_000));
  expect(summarize(windowed).answered).toBe(4); // the 30-day window excluded the old attempt
  expect(await bucketsFor(db as never, "00000000-0000-0000-0000-0000000000ff", null)).toEqual([]);
});

it("feeds the shared metric layer: accuracy and average time agree with the buckets", async () => {
  const s = summarize(await bucketsFor(db as never, USER, null));
  // Answered: 5 (the unanswered row is out). Correct: 3. Timed: 20s, 40s and 60s, so the average is 40s.
  expect(s.answered).toBe(5);
  expect(s.correct).toBe(3);
  expect(s.accuracy).toBe(60);
  expect(s.timedN).toBe(3);
  expect(s.avgSeconds).toBe(40);
});
