// Adaptive 24-question diagnostic: 8 domains x 3, difficulty staircase (spec 03 §4).
import { DIAGNOSTIC_PER_DOMAIN, type Difficulty } from "./constants";
import { clamp } from "./mastery";

export const DOMAIN_ORDER = ["rw-ii", "rw-cs", "rw-ei", "rw-sec", "m-alg", "m-adv", "m-psda", "m-geo"] as const;
export const DIAGNOSTIC_LENGTH = DOMAIN_ORDER.length * DIAGNOSTIC_PER_DOMAIN;

export type DiagAnswered = { domain: string; skillId: string; difficulty: Difficulty; correct: boolean };
export type DiagSpec = { domain: string; skillId: string; difficulty: Difficulty };

export function nextDiagnosticSpec(
  answered: DiagAnswered[],
  domainPriorTheta: Record<string, number>, // mean prior theta of the domain's skills
  skillsByDomain: Record<string, string[]>, // in taxonomy order
): DiagSpec | null {
  const domain = DOMAIN_ORDER.find((d) => answered.filter((a) => a.domain === d).length < DIAGNOSTIC_PER_DOMAIN);
  if (!domain) return null;
  const done = answered.filter((a) => a.domain === domain);
  let difficulty: Difficulty;
  if (done.length === 0) {
    const p = domainPriorTheta[domain] ?? 0;
    difficulty = p < -0.6 ? 1 : p > 0.8 ? 3 : 2;
  } else {
    const last = done[done.length - 1]!;
    difficulty = clamp(last.difficulty + (last.correct ? 1 : -1), 1, 3) as Difficulty;
  }
  const skills = skillsByDomain[domain]!;
  const skillId = skills.find((s) => !done.some((a) => a.skillId === s)) ?? skills[done.length % skills.length]!;
  return { domain, skillId, difficulty };
}
