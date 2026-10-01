// Elo / 1PL-IRT hybrid student model (spec 03 §1–2).
import * as C from "./constants";
import type { Difficulty } from "./constants";

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function pCorrect(theta: number, difficulty: Difficulty, isMcq: boolean): number {
  const s = sigmoid(theta - C.DIFF_B[difficulty]);
  return isMcq ? C.GUESS_MCQ + (1 - C.GUESS_MCQ) * s : s;
}

export const kFactor = (n: number) => Math.max(C.K_MIN, C.K0 / (1 + C.K_DECAY * n));

/** Signed change in theta for one answer. `weight` scales the step. */
export function thetaDelta(
  theta: number, n: number, difficulty: Difficulty, isMcq: boolean, correct: boolean, weight = 1,
): number {
  return weight * kFactor(n) * ((correct ? 1 : 0) - pCorrect(theta, difficulty, isMcq));
}

export const applyDelta = (theta: number, delta: number) => clamp(theta + delta, C.THETA_MIN, C.THETA_MAX);

export const masteryPct = (theta: number) => Math.round(100 * sigmoid(theta));
export const sigma = (n: number) => C.SIGMA0 / Math.sqrt(1 + n / C.SIGMA_DECAY);
export const certaintyPct = (n: number) => Math.round(100 * (1 - sigma(n) / C.SIGMA0));
export const certaintyLabel = (n: number) => {
  const c = certaintyPct(n);
  return c < 40 ? "low" : c < 70 ? "medium" : "high";
};

export type Status = "unknown" | "weak" | "developing" | "strong" | "mastered";
/** `hasEvidence` = the user has at least one attempt anywhere in this skill's domain (spec 03 §9). */
export function status(theta: number, hasEvidence: boolean): Status {
  if (!hasEvidence) return "unknown";
  const m = masteryPct(theta);
  if (m < C.STATUS.weak) return "weak";
  if (m < C.STATUS.developing) return "developing";
  if (m < C.STATUS.strong) return "strong";
  return "mastered";
}

export type Pace = "fast" | "on pace" | "slow";
export function pace(avgMs: number, section: "rw" | "math"): Pace {
  const r = avgMs / (C.TARGET_SECONDS[section] * 1000);
  return r < 0.8 ? "fast" : r > 1.5 ? "slow" : "on pace";
}

/** Accuracy of the last 10 vs the 10 before (newest first input). */
export function trend(recentCorrectNewestFirst: boolean[]): "improving" | "declining" | "steady" | null {
  if (recentCorrectNewestFirst.length < 12) return null;
  const acc = (xs: boolean[]) => (100 * xs.filter(Boolean).length) / xs.length;
  const last = acc(recentCorrectNewestFirst.slice(0, 10));
  const prev = acc(recentCorrectNewestFirst.slice(10, 20));
  return last - prev > 10 ? "improving" : last - prev < -10 ? "declining" : "steady";
}
