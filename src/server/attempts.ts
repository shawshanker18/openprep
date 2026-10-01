// The ONE write path for attempts and skill_state.theta (spec 00 §4 rule 3, 03 §9).
// Always called inside a transaction by the caller.
import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import type { Tx } from "@/db";
import { attempts, reviewItems, skillState, type Question } from "@/db/schema";
import { skillsIn } from "@/content/taxonomy";
import { GUESSED_CORRECT_WEIGHT, MAX_ATTEMPT_MS, REVIEW_WEIGHT, SIBLING_MAX_N, SIBLING_SHARE, type Difficulty } from "@/engine/constants";
import { applyDelta, thetaDelta } from "@/engine/mastery";
import { grade } from "@/engine/grade";
import { guessMistakeType, type MistakeType } from "@/engine/mistakes";
import { afterReview, firstReviewDue } from "@/engine/review";

export type AttemptContext = "practice" | "review" | "diagnostic" | "test";

export async function recordAttempt(tx: Tx, userId: string, q: Question, a: {
  response: string | null; timeMs: number; confidence: 1 | 2 | 3 | null;
  context: AttemptContext; sessionId?: string; now: Date;
}) {
  const correct = a.response !== null && grade(q, a.response);
  const timeMs = Math.min(Math.max(a.timeMs, 0), MAX_ATTEMPT_MS);

  // Lock the domain's rows so two tabs cannot interleave updates.
  const rows = await tx.select().from(skillState)
    .where(and(eq(skillState.userId, userId), inArray(skillState.skillId, skillsIn(q.domain).map((s) => s.id))))
    .for("update");
  const own = rows.find((r) => r.skillId === q.skillId);
  if (!own) throw new Error(`skill_state missing for ${q.skillId}: onboarding self-assessment not completed`);

  const weight = a.context === "review" ? REVIEW_WEIGHT : correct && a.confidence === 1 ? GUESSED_CORRECT_WEIGHT : 1;
  const delta = thetaDelta(own.theta, own.n, q.difficulty as Difficulty, q.type === "mcq", correct, weight);
  const thetaAfter = applyDelta(own.theta, delta);

  await tx.update(skillState).set({
    theta: thetaAfter, n: own.n + 1, nCorrect: own.nCorrect + (correct ? 1 : 0),
    totalTimeMs: own.totalTimeMs + timeMs, lastPracticedAt: a.now,
  }).where(and(eq(skillState.userId, userId), eq(skillState.skillId, q.skillId)));

  // Share evidence with same-domain skills that have little of their own.
  for (const sib of rows) {
    if (sib.skillId === q.skillId || sib.n >= SIBLING_MAX_N) continue;
    await tx.update(skillState).set({ theta: applyDelta(sib.theta, SIBLING_SHARE * delta) })
      .where(and(eq(skillState.userId, userId), eq(skillState.skillId, sib.skillId)));
  }

  const mistakeType: MistakeType | null = correct ? null
    : a.response === null ? (a.context === "test" ? "timing" : "concept")
    : guessMistakeType({ section: q.section as "rw" | "math", skillId: q.skillId, timeMs, theta: own.theta, difficulty: q.difficulty as Difficulty });

  const [row] = await tx.insert(attempts).values({
    userId, questionId: q.id, skillId: q.skillId, context: a.context, sessionId: a.sessionId,
    response: a.response, correct, timeMs, confidence: a.confidence, mistakeType,
    thetaBefore: own.theta, thetaAfter,
  }).returning({ id: attempts.id });

  const key = and(eq(reviewItems.userId, userId), eq(reviewItems.questionId, q.id));
  if (a.context === "review") {
    const [item] = await tx.select().from(reviewItems).where(key);
    const next = afterReview(item?.stage ?? 0, correct, a.now);
    if (next === "done") await tx.delete(reviewItems).where(key);
    else await tx.insert(reviewItems).values({ userId, questionId: q.id, ...next })
      .onConflictDoUpdate({ target: [reviewItems.userId, reviewItems.questionId], set: next });
  } else if (!correct) {
    const dueAt = firstReviewDue(a.confidence, a.now);
    await tx.insert(reviewItems).values({ userId, questionId: q.id, stage: 0, dueAt })
      .onConflictDoUpdate({ target: [reviewItems.userId, reviewItems.questionId], set: { stage: 0, dueAt } });
  }

  return { attemptId: row!.id, correct, thetaBefore: own.theta, thetaAfter, mistakeType };
}
