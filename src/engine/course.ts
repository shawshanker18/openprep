// The SAT course (Khan-style structure, OpenPrep content): units = SAT domains, skills inside, a quiz after every
// few skills, a unit test per unit, and one course challenge per section. Mastery levels come from the student model.
import { DOMAINS, skillsIn, type DomainId, type Section, type Skill } from "@/content/taxonomy";
import type { Status } from "./mastery";

export type Level = "not-started" | "attempted" | "familiar" | "proficient" | "mastered";
export const LEVELS: { id: Level; label: string }[] = [
  { id: "mastered", label: "Mastered" },
  { id: "proficient", label: "Proficient" },
  { id: "familiar", label: "Familiar" },
  { id: "attempted", label: "Attempted" },
  { id: "not-started", label: "Not started" },
];
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l])) as Record<Level, (typeof LEVELS)[number]>;

/** A skill's course level: nothing answered yet is "not started"; after that it follows the mastery status. */
export function levelOf(attempts: number, status: Status): Level {
  if (attempts === 0) return "not-started";
  return status === "mastered" ? "mastered" : status === "strong" ? "proficient" : status === "developing" ? "familiar" : "attempted";
}

export const QUIZ_EVERY = 3;
export type UnitStep = { kind: "skill"; skill: Skill } | { kind: "quiz"; n: number; skills: Skill[] } | { kind: "unit-test"; skills: Skill[] };

/** Skills in order, with a quiz after every QUIZ_EVERY skills (and after the leftovers), then the unit test. */
export function unitSteps(domain: DomainId): UnitStep[] {
  const skills = skillsIn(domain);
  const steps: UnitStep[] = [];
  for (let i = 0; i < skills.length; i += QUIZ_EVERY) {
    const group = skills.slice(i, i + QUIZ_EVERY);
    group.forEach((skill) => steps.push({ kind: "skill", skill }));
    if (skills.length > QUIZ_EVERY) steps.push({ kind: "quiz", n: i / QUIZ_EVERY + 1, skills: group });
  }
  steps.push({ kind: "unit-test", skills });
  return steps;
}

export const unitsOf = (section: Section) => (Object.keys(DOMAINS) as DomainId[]).filter((d) => DOMAINS[d].section === section);

/** Question count for a course check: a quiz is short, a unit test covers every skill, the challenge is the longest. */
export const checkCount = (kind: "quiz" | "unit-test" | "challenge", skills: number) =>
  kind === "quiz" ? Math.min(30, Math.max(5, skills * 2)) : kind === "unit-test" ? Math.min(30, Math.max(8, skills * 3)) : 30;
