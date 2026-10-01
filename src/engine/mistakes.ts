// Mistake types and the pre-selected guess shown to the student (spec 03 §6).
import { DIFF_B, TARGET_SECONDS, type Difficulty } from "./constants";

export const MISTAKE_TYPES = ["concept", "careless", "misread", "calculation", "strategy", "timing", "knowledge"] as const;
export type MistakeType = (typeof MISTAKE_TYPES)[number];
export const MISTAKE_LABEL: Record<MistakeType, string> = {
  concept: "Concept", careless: "Careless", misread: "Misread", calculation: "Calculation",
  strategy: "Strategy", timing: "Timing", knowledge: "Vocabulary / Grammar",
};

export function guessMistakeType(x: {
  section: "rw" | "math"; skillId: string; timeMs: number; theta: number; difficulty: Difficulty;
}): MistakeType {
  const target = TARGET_SECONDS[x.section] * 1000;
  if (x.timeMs > 2 * target) return "timing";
  if (x.timeMs < 0.35 * target) return "careless";
  if (x.theta - DIFF_B[x.difficulty] > 1) return x.section === "math" ? "calculation" : "misread";
  if (x.skillId === "rw-cs-words" || x.skillId.startsWith("rw-sec")) return "knowledge";
  return "concept";
}
