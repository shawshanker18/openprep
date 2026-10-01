// Daily plan: generated once per local day, never rearranged (spec 03 §10).
import { POINTS_PER_STUDY_HOUR, READY_BUFFER_WEEKS, TARGET_SECONDS } from "./constants";

/** `custom` marks blocks of a plan the student edited by hand (today only). */
export type PlanBlock = (
  | { kind: "review"; minutes: number; done: boolean }
  | { kind: "learn"; minutes: number; skillId: string; done: boolean }
  | { kind: "practice"; minutes: number; skillId: string; done: boolean }
  | { kind: "desmos"; minutes: number; lessonSlug: string; done: boolean }
  | { kind: "mini"; minutes: number; skillId: string; done: boolean }
) & { custom?: true };

export type PlanFocus = {
  skillId: string; section: "rw" | "math"; masteryPct: number; lessonDone: boolean; attemptsThisWeek: number;
};

const LEARN_MAX = 15;

export function buildDailyPlan(x: {
  minutes: number; dueReviews: number; focus: PlanFocus[]; nextDesmosLesson: string | null; dayOfWeekIndex: number;
  /** Days until the test (plan §16); null/negative = no upcoming test. */
  daysToTest?: number | null;
}): PlanBlock[] {
  const near = x.daysToTest != null && x.daysToTest >= 0;
  const within28 = near && x.daysToTest! <= 28, within7 = near && x.daysToTest! <= 7;
  const blocks: PlanBlock[] = [];
  let left = x.minutes;
  const round5 = (m: number) => Math.max(5, Math.round(m / 5) * 5);

  if (x.dueReviews > 0 && left >= 15) {
    const m = Math.min(10, round5(left * 0.2));
    blocks.push({ kind: "review", minutes: m, done: false });
    left -= m;
  }
  if (x.nextDesmosLesson && left >= 40 && x.dayOfWeekIndex % 2 === 0) {
    blocks.push({ kind: "desmos", minutes: 10, lessonSlug: x.nextDesmosLesson, done: false });
    left -= 10;
  }
  const shares = [0.5, 0.3, 0.2];
  const pool = left;
  const picks = x.focus.slice(0, 3);
  let miniDone = false;
  picks.forEach((f, i) => {
    // The last focus skill takes whatever is left, so the day adds up to exactly the student's minutes.
    const m = i === picks.length - 1 ? left : Math.min(left, round5(pool * shares[i]!));
    if (m < 5) return;
    // Final week: no new lessons, practise and check in instead.
    let kind: "learn" | "practice" | "mini" = !within7 && !f.lessonDone && f.masteryPct < 45 ? "learn" : "practice";
    // A mini test needs 15 minutes; below that, practise instead (keeps the plan inside the budget).
    // Within 4 weeks of the test the first practice block always becomes a timed check-in.
    if (kind === "practice" && !miniDone && m >= 15 && (within28 || (i === 0 && f.attemptsThisWeek >= 20))) kind = "mini";
    if (kind === "mini") miniDone = true;
    if (kind === "learn" && m >= LEARN_MAX + 10) {
      // A lesson takes ~15 minutes; use the rest of the slot to practise the same skill straight away.
      blocks.push({ kind, minutes: LEARN_MAX, skillId: f.skillId, done: false });
      blocks.push({ kind: "practice", minutes: m - LEARN_MAX, skillId: f.skillId, done: false });
    } else blocks.push({ kind, minutes: m, skillId: f.skillId, done: false });
    left -= m;
  });
  return blocks;
}

/** Questions that complete a practice/review block of `minutes`. */
export const questionsForBlock = (minutes: number, section: "rw" | "math") =>
  Math.ceil((minutes * 60) / (TARGET_SECONDS[section] * 1.5));

/** "YYYY-MM-DD" in the user's timezone. */
export const localDate = (now: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

/** Monday of the ISO week containing `day` ("YYYY-MM-DD"). */
export function weekOf(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Mon = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
export const dayOfWeekIndex = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;

/** Advice only: is the target realistic at the current pace? */
export function paceCheck(estimateTotal: number, targetTotal: number, daysLeft: number): "stretch" | "ok" {
  const weeks = Math.max(1, daysLeft / 7);
  return (targetTotal - estimateTotal) / weeks > 25 ? "stretch" : "ok";
}

/**
 * When the student is predicted to reach their target at their current study budget.
 * weeks = ceil(points needed / (study hours per week × POINTS_PER_STUDY_HOUR)) + buffer. null = more than two years away.
 */
export function readyBy(x: { estimate: number; target: number; minutesPerDay: number; daysPerWeek: number; now: Date }) {
  const gap = x.target - x.estimate;
  const perWeek = ((x.minutesPerDay * x.daysPerWeek) / 60) * POINTS_PER_STUDY_HOUR;
  const weeks = gap <= 0 ? READY_BUFFER_WEEKS : perWeek > 0 ? Math.ceil(gap / perWeek) + READY_BUFFER_WEEKS : Infinity;
  if (weeks > 104) return null;
  return { weeks, date: new Date(x.now.getTime() + weeks * 7 * 86_400_000) };
}
