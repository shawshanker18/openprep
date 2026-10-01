// Tiny spaced-repetition queue for missed questions: +1d, +3d, +7d (spec 03 §6).
import { MISCONCEPTION_REVIEW_HOURS, REVIEW_INTERVAL_DAYS } from "./constants";

const DAY = 86_400_000;

export function afterReview(stage: number, correct: boolean, now: Date): { stage: number; dueAt: Date } | "done" {
  if (!correct) return { stage: 0, dueAt: new Date(now.getTime() + REVIEW_INTERVAL_DAYS[0]! * DAY) };
  const next = stage + 1;
  if (next >= REVIEW_INTERVAL_DAYS.length) return "done";
  return { stage: next, dueAt: new Date(now.getTime() + REVIEW_INTERVAL_DAYS[next]! * DAY) };
}

/** First due time after a fresh miss. Sure-but-wrong = misconception → sooner. */
export function firstReviewDue(confidence: 1 | 2 | 3 | null, now: Date): Date {
  const hours = confidence === 3 ? MISCONCEPTION_REVIEW_HOURS : 24;
  return new Date(now.getTime() + hours * 3_600_000);
}
