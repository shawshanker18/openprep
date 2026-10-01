// Practice: which question next, and submitting an answer (spec 04 §3).
import "server-only";
import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, questions, reviewItems, skillState, type Profile, type Question } from "@/db/schema";
import { SKILL_BY_ID } from "@/content/taxonomy";
import type { Difficulty } from "@/engine/constants";
import { masteryPct } from "@/engine/mastery";
import { pickQuestion, targetDifficulty } from "@/engine/select";
import { recordAttempt } from "./attempts";
import { ensureWeeklyFocus, skillsByPriority } from "./plan";
import { toPublic, toRevealed } from "./questions";

export type PracticeMode = "skill" | "smart" | "review";

async function dueReview(userId: string, now: Date, exclude: string[]) {
  const rows = await db.select({ q: questions }).from(reviewItems)
    .innerJoin(questions, eq(questions.id, reviewItems.questionId))
    .where(and(eq(reviewItems.userId, userId), lte(reviewItems.dueAt, now)))
    .orderBy(asc(reviewItems.dueAt)).limit(exclude.length + 1);
  return rows.map((r) => r.q).find((q) => !exclude.includes(q.id)) ?? null;
}

export async function countDueReviews(userId: string, now = new Date()) {
  const [r] = await db.select({ c: count() }).from(reviewItems)
    .where(and(eq(reviewItems.userId, userId), lte(reviewItems.dueAt, now)));
  return r!.c;
}

/** Pick a question in one skill: similar-question after a miss, else adaptive difficulty. */
async function pickInSkill(userId: string, skillId: string, exclude: string[], now: Date, forced?: Difficulty) {
  const [pool, seen, queued, [state], [last]] = await Promise.all([
    db.select().from(questions).where(and(eq(questions.skillId, skillId), eq(questions.status, "active"))),
    db.select({ id: attempts.questionId, at: sql<Date>`max(${attempts.createdAt})` }).from(attempts)
      .where(and(eq(attempts.userId, userId), eq(attempts.skillId, skillId))).groupBy(attempts.questionId),
    db.select({ id: reviewItems.questionId }).from(reviewItems).where(eq(reviewItems.userId, userId)),
    db.select().from(skillState).where(and(eq(skillState.userId, userId), eq(skillState.skillId, skillId))),
    db.select({ q: questions, correct: attempts.correct }).from(attempts)
      .innerJoin(questions, eq(questions.id, attempts.questionId))
      .where(and(eq(attempts.userId, userId), eq(attempts.skillId, skillId)))
      .orderBy(desc(attempts.createdAt)).limit(1),
  ]);
  const lastSeen = new Map(seen.map((s) => [s.id, new Date(s.at)]));
  const blocked = new Set([...exclude, ...queued.map((r) => r.id)]);
  const candidates = pool.filter((q) => !blocked.has(q.id))
    .map((q) => ({ ...q, difficulty: q.difficulty as Difficulty, lastSeenAt: lastSeen.get(q.id) ?? null }));

  // Missed the previous question in this session → one similar question (same difficulty, shared tag).
  const missedJustNow = last && !last.correct && exclude.includes(last.q.id);
  const want = forced ?? (missedJustNow ? (last.q.difficulty as Difficulty) : targetDifficulty(state?.theta ?? 0, Math.random));
  return pickQuestion(candidates, want, now, Math.random, missedJustNow ? last.q.tags : []) as (typeof candidates)[number] | null;
}

export async function nextQuestion(userId: string, profile: Profile, input: {
  mode: PracticeMode; skillId?: string; exclude: string[]; difficulty?: Difficulty;
}) {
  const now = new Date();
  let q: Question | null = null;

  if (input.mode === "review") {
    q = await dueReview(userId, now, input.exclude);
  } else if (input.mode === "skill") {
    if (!input.skillId || !SKILL_BY_ID[input.skillId]) return null;
    q = await pickInSkill(userId, input.skillId, input.exclude, now, input.difficulty);
  } else {
    // Smart: weekly focus, switching skill every 5 answers today; every 6th question is a due review.
    // ponytail: "today" = last 24h, not the local calendar day; switch to localDate() if rotation feels off.
    const startOfDay = new Date(now.getTime() - 24 * 3_600_000);
    const [{ c: today }] = (await db.select({ c: count() }).from(attempts)
      .where(and(eq(attempts.userId, userId), gte(attempts.createdAt, startOfDay), inArray(attempts.context, ["practice", "review"])))) as [{ c: number }];
    if (today > 0 && today % 6 === 5) q = await dueReview(userId, now, input.exclude);
    if (!q) {
      const focus = await ensureWeeklyFocus(userId, profile, now);
      const rotated = focus.length ? [...focus.slice(Math.floor(today / 5) % focus.length), ...focus] : [];
      const fallback = (await skillsByPriority(userId, profile)).map((s) => s.skillId);
      for (const skillId of [...new Set([...rotated, ...fallback])]) {
        q = await pickInSkill(userId, skillId, input.exclude, now);
        if (q) break;
      }
    }
  }
  return q ? { question: toPublic(q), reviewsDue: await countDueReviews(userId, now) } : null;
}

export async function submitAnswer(userId: string, input: {
  questionId: string; response: string | null; timeMs: number; confidence: 1 | 2 | 3;
}) {
  const [q] = await db.select().from(questions).where(eq(questions.id, input.questionId));
  if (!q) return null;
  return db.transaction(async (tx) => {
    // A question in the user's review queue is always recorded as a review, whatever the client says.
    const [queued] = await tx.select().from(reviewItems)
      .where(and(eq(reviewItems.userId, userId), eq(reviewItems.questionId, q.id)));
    const r = await recordAttempt(tx, userId, q, {
      response: input.response, timeMs: input.timeMs, confidence: input.confidence,
      context: queued ? "review" : "practice", now: new Date(),
    });
    return {
      correct: r.correct, attemptId: r.attemptId, revealed: toRevealed(q),
      masteryBefore: masteryPct(r.thetaBefore), masteryAfter: masteryPct(r.thetaAfter),
      mistakeGuess: r.mistakeType, skillName: SKILL_BY_ID[q.skillId]?.name ?? q.skillId,
    };
  });
}
