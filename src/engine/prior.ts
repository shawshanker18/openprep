// Starting theta from survey + self-assessment (spec 03 §3).
import { SCORE_SLOPE } from "./constants";
import { clamp } from "./mastery";

export type SelfRating = 0 | 1 | 2 | 3;
const SELF_THETA = [-1.2, -0.4, 0.4, 0.9] as const; // don't know, a little, know it, very confident

export function priorTheta(input: {
  selfRating: SelfRating | null;     // null (skipped) is treated as 1
  topicStudied: boolean;
  boardImplied?: boolean;               // the student's board/grade usually covers it (smaller nudge)
  priorSectionScore: number | null;
}): number {
  const self = SELF_THETA[input.selfRating ?? 1];
  const bonus = input.topicStudied ? 0.2 : input.boardImplied ? 0.1 : 0;
  if (input.priorSectionScore == null) return clamp(0.6 * self + bonus, -2, 2);
  const fromScore = (input.priorSectionScore - 500) / SCORE_SLOPE;
  return clamp(0.5 * self + 0.5 * fromScore + bonus, -2, 2);
}

export type Calibration = "overestimated" | "underestimated" | "accurate";
export function calibration(selfRating: SelfRating | null, masteryPct: number, ownN: number): Calibration | null {
  if (selfRating == null || ownN < 4) return null;
  if (selfRating >= 2 && masteryPct < 45) return "overestimated";
  if (selfRating <= 1 && masteryPct >= 70) return "underestimated";
  return "accurate";
}
