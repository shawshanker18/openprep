// Daily plan: generated once per local day, never rearranged (spec 03 §10).
import { TARGET_SECONDS } from "./constants";

export type PlanBlock =
  | { kind: "review"; minutes: number; done: boolean }
  | { kind: "learn"; minutes: number; skillId: string; done: boolean }
  | { kind: "practice"; minutes: number; skillId: string; done: boolean }
  | { kind: "desmos"; minutes: number; lessonSlug: string; done: boolean }
  | { kind: "mini"; minutes: number; skillId: string; done: boolean };

export type PlanFocus = {
  skillId: string; section: "rw" | "math"; masteryPct: number; lessonDone: boolean; attemptsThisWeek: number;
};

export function buildDailyPlan(x: {
  minutes: number; dueReviews: number; focus: PlanFocus[]; nextDesmosLesson: string | null; dayOfWeekIndex: number;
}): PlanBlock[] {
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
  x.focus.slice(0, 3).forEach((f, i) => {
    const m = round5(pool * shares[i]!);
    if (m > left) return;
    // A mini test needs 15 minutes; below that, practise instead (keeps the plan inside the budget).
    const kind = !f.lessonDone && f.masteryPct < 45 ? "learn"
      : f.attemptsThisWeek >= 20 && i === 0 && m >= 15 ? "mini" : "practice";
    blocks.push({ kind, minutes: m, skillId: f.skillId, done: false });
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
