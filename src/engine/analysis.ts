// Shared metric definitions for Progress and Analysis. Pure functions over aggregated buckets, so the
// same numbers come out wherever they are shown, and the rules are unit-tested without a database.
import { MAX_ATTEMPT_MS, type Difficulty } from "./constants";

/** Below this, a "answer" was almost certainly an accidental double-tap or a pre-filled submit, not thinking time. */
export const MIN_VALID_MS = 1_000;
/** Fewer answered questions than this and a skill is shown as "Limited data" instead of being ranked as weak. */
export const MIN_SAMPLE = 5;

/** One (skill, difficulty) cell of a student's answer history. Built by SQL in server/analysis.ts. */
export type Bucket = {
  skillId: string;
  difficulty: Difficulty;
  /** Attempts with a response. Unanswered attempts (timed out, skipped) are not eligible for accuracy. */
  answered: number;
  correct: number;
  /** Answered attempts whose duration is valid (see isValidDuration). Averages use only these. */
  timedN: number;
  timedMs: number;
};

export type Summary = {
  answered: number;
  correct: number;
  incorrect: number;
  /** Whole-number percent, or null when nothing has been answered (never 0 by default). */
  accuracy: number | null;
  timedN: number;
  /** Mean of valid durations, in seconds with one decimal, or null when there is no valid timing. */
  avgSeconds: number | null;
};

/**
 * A recorded duration is usable when it is at least MIN_VALID_MS and below the server cap. Attempts at the cap were
 * clamped by recordAttempt, so the real time is unknown: they are excluded, not averaged in as 10 minutes.
 * Missing durations (null, NaN) are never treated as zero.
 */
export function isValidDuration(ms: number | null | undefined): ms is number {
  return typeof ms === "number" && Number.isFinite(ms) && ms >= MIN_VALID_MS && ms < MAX_ATTEMPT_MS;
}

export function accuracyPct(correct: number, answered: number): number | null {
  return answered > 0 ? Math.round((100 * correct) / answered) : null;
}

export function avgSeconds(timedMs: number, timedN: number): number | null {
  return timedN > 0 ? Math.round((timedMs / timedN / 1000) * 10) / 10 : null;
}

export function summarize(buckets: Bucket[]): Summary {
  let answered = 0, correct = 0, timedN = 0, timedMs = 0;
  for (const b of buckets) {
    answered += b.answered;
    correct += b.correct;
    timedN += b.timedN;
    timedMs += b.timedMs;
  }
  return {
    answered, correct, incorrect: answered - correct,
    accuracy: accuracyPct(correct, answered),
    timedN, avgSeconds: avgSeconds(timedMs, timedN),
  };
}

/** Summaries for Easy (1), Medium (2) and Hard (3). Every key is present, even with no data. */
export function byDifficulty(buckets: Bucket[]): Record<Difficulty, Summary> {
  const out = {} as Record<Difficulty, Summary>;
  for (const d of [1, 2, 3] as const) out[d] = summarize(buckets.filter((b) => b.difficulty === d));
  return out;
}

/** Group buckets by any key (domain, section, skill) and summarise each group. */
export function groupSummaries<K extends string>(buckets: Bucket[], keyOf: (b: Bucket) => K | undefined): Map<K, Summary> {
  const groups = new Map<K, Bucket[]>();
  for (const b of buckets) {
    const k = keyOf(b);
    if (k === undefined) continue; // unclassified: left out, never guessed into a group
    groups.set(k, [...(groups.get(k) ?? []), b]);
  }
  return new Map([...groups].map(([k, bs]) => [k, summarize(bs)]));
}

/**
 * Whether a summary has enough answers to rank or label. Used so a single wrong answer never reads as a weakness.
 */
export function hasEnoughData(s: Summary): boolean {
  return s.answered >= MIN_SAMPLE;
}

/**
 * Share of all recorded mistakes that come from one group, as a whole-number percent. Null when there are no mistakes.
 * Each mistake is counted once, under the single domain its skill belongs to, so shares add up to 100 (± rounding).
 */
export function shareOfMistakes(part: Summary, total: Summary): number | null {
  return total.incorrect > 0 ? Math.round((100 * part.incorrect) / total.incorrect) : null;
}

/** Change in accuracy between two periods, in percentage points. Null unless both periods have data. */
export function accuracyChange(earlier: Summary, later: Summary): number | null {
  if (earlier.accuracy === null || later.accuracy === null) return null;
  return later.accuracy - earlier.accuracy;
}

/** Below this accuracy (with enough answers) a skill is suggested for targeted practice. Product tunable. */
export const PRACTICE_BELOW_PCT = 60;
/** At or above this accuracy, a skill that is still slow is suggested for timed work. Product tunable. */
export const SPEED_ABOVE_PCT = 80;
/** A skill is "slow" when its average is this many times the section's target time per question. */
export const SLOW_FACTOR = 1.5;

export type SkillRow = { skillId: string; name: string; section: "rw" | "math"; summary: Summary };
export type Recommendation = { kind: "practice" | "speed"; skillId: string; name: string; reason: string };

/**
 * Transparent next steps from real answers. Skills with fewer than MIN_SAMPLE answers are never ranked, so one wrong
 * answer cannot create a weakness. Returns at most `limit` items of each kind, weakest first.
 */
export function recommend(rows: SkillRow[], targetSeconds: Record<"rw" | "math", number>, limit = 3): Recommendation[] {
  const rated = rows.filter((r) => hasEnoughData(r.summary) && r.summary.accuracy !== null);
  const weak = rated
    .filter((r) => r.summary.accuracy! < PRACTICE_BELOW_PCT)
    .sort((a, b) => a.summary.accuracy! - b.summary.accuracy! || b.summary.incorrect - a.summary.incorrect)
    .slice(0, limit)
    .map<Recommendation>((r) => ({
      kind: "practice", skillId: r.skillId, name: r.name,
      reason: `${r.summary.accuracy}% correct over ${r.summary.answered} answers. Targeted practice here.`,
    }));
  const slow = rated
    .filter((r) => r.summary.accuracy! >= SPEED_ABOVE_PCT && r.summary.avgSeconds !== null
      && r.summary.avgSeconds > targetSeconds[r.section] * SLOW_FACTOR)
    .sort((a, b) => b.summary.avgSeconds! - a.summary.avgSeconds!)
    .slice(0, limit)
    .map<Recommendation>((r) => ({
      kind: "speed", skillId: r.skillId, name: r.name,
      reason: `Accurate (${r.summary.accuracy}%) but averaging ${r.summary.avgSeconds}s against a ${targetSeconds[r.section]}s target. Timed practice may help.`,
    }));
  return [...weak, ...slow];
}
