// Aggregated attempt history for the Analysis page. Aggregation happens in SQL so the page never loads raw attempts.
import "server-only";
import { cache } from "react";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, questions } from "@/db/schema";
import { MAX_ATTEMPT_MS, type Difficulty } from "@/engine/constants";
import { MIN_VALID_MS, type Bucket } from "@/engine/analysis";

export const RANGES = { "7d": 7, "30d": 30, "90d": 90, all: null } as const;
export type Range = keyof typeof RANGES;
export const parseRange = (v: unknown): Range => (typeof v === "string" && v in RANGES ? (v as Range) : "30d");

/** Start of the window for a range, or null for "all time". */
export function rangeSince(range: Range, now = Date.now()): Date | null {
  const days = RANGES[range];
  return days === null ? null : new Date(now - days * 86_400_000);
}

/** The query's client, so tests can run it against an in-process database. */
type Client = Pick<typeof db, "select">;

/**
 * Per skill and difficulty, how the student did. Answered = has a response. Timing uses only durations that pass
 * isValidDuration, mirroring the TypeScript rule in engine/analysis.ts (kept in step by the same constants).
 */
export async function bucketsFor(client: Client, userId: string, since: Date | null): Promise<Bucket[]> {
  const validTime = sql`${attempts.response} is not null and ${attempts.timeMs} >= ${MIN_VALID_MS} and ${attempts.timeMs} < ${MAX_ATTEMPT_MS}`;
  const rows = await client.select({
    skillId: attempts.skillId,
    difficulty: questions.difficulty,
    answered: sql<number>`count(*) filter (where ${attempts.response} is not null)::int`,
    correct: sql<number>`count(*) filter (where ${attempts.correct})::int`,
    timedN: sql<number>`count(*) filter (where ${validTime})::int`,
    timedMs: sql<number>`coalesce(sum(${attempts.timeMs}) filter (where ${validTime}), 0)::bigint`,
  }).from(attempts)
    .innerJoin(questions, eq(questions.id, attempts.questionId))
    .where(and(eq(attempts.userId, userId), since ? gte(attempts.createdAt, since) : undefined))
    .groupBy(attempts.skillId, questions.difficulty);
  return rows.map((r) => ({
    skillId: r.skillId, difficulty: r.difficulty as Difficulty,
    answered: r.answered, correct: r.correct, timedN: r.timedN, timedMs: Number(r.timedMs),
  }));
}

export const getAnalysisBuckets = cache((userId: string, since: Date | null) => bucketsFor(db, userId, since));

/** Answered questions and correct answers per local day, for the accuracy-over-time chart. */
export async function getDailyAccuracy(userId: string, timezone: string, since: Date | null) {
  const rows = await db.select({
    day: sql<string>`to_char(${attempts.createdAt} at time zone ${timezone}, 'YYYY-MM-DD')`,
    answered: sql<number>`count(*) filter (where ${attempts.response} is not null)::int`,
    correct: sql<number>`count(*) filter (where ${attempts.correct})::int`,
  }).from(attempts)
    .where(and(eq(attempts.userId, userId), sql`${attempts.response} is not null`, since ? gte(attempts.createdAt, since) : undefined))
    .groupBy(sql`1`).orderBy(sql`1`);
  return rows;
}
