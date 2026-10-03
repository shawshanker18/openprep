// Test scoring, score estimates, superscore, test insights (spec 03 §8, §11).
import { DOMAINS, SKILLS, SKILL_BY_ID, skillWeight, type DomainId } from "@/content/taxonomy";
import { MOCK_HALF_WIDTH, SCORE_SLOPE, TARGET_SECONDS, type Difficulty } from "./constants";
import { clamp, sigma } from "./mastery";
import { MISTAKE_LABEL, type MistakeType } from "./mistakes";

const round10 = (x: number) => Math.round(x / 10) * 10;

/** Transparent approximation; the real SAT uses proprietary IRT. */
export function mockSectionScore(correct: number, total: number, route: "hard" | "easy" | "base"): number {
  const frac = total === 0 ? 0 : correct / total;
  const span = route === "easy" ? 420 : 600; // easy route tops out at 620
  return round10(200 + span * frac);
}

export function sectionEstimate(states: { skillId: string; theta: number; n: number }[], section: "rw" | "math") {
  let theta = 0, variance = 0;
  for (const s of SKILLS.filter((k) => k.section === section)) {
    const st = states.find((x) => x.skillId === s.id);
    const w = skillWeight(s);
    theta += w * (st?.theta ?? 0);
    variance += (w * sigma(st?.n ?? 0)) ** 2;
  }
  const score = clamp(round10(500 + SCORE_SLOPE * theta), 200, 800);
  const half = clamp(round10(SCORE_SLOPE * Math.sqrt(variance) * 1.5 + 20), 30, 120);
  return { score, half };
}

export type Estimate = { score: number; half: number };
export function totalEstimate(rw: Estimate, math: Estimate) {
  const total = rw.score + math.score;
  const half = round10(Math.sqrt(rw.half ** 2 + math.half ** 2));
  return { total, half, lo: Math.max(400, total - half), hi: Math.min(1600, total + half) };
}

/** Dashboard headline: average model and recent mock (<= 30 days), take the narrower range. */
export function headlineEstimate(model: { total: number; half: number }, mock: { total: number; half: number } | null) {
  if (!mock) return { total: model.total, lo: Math.max(400, model.total - model.half), hi: Math.min(1600, model.total + model.half) };
  const total = round10((model.total + mock.total) / 2);
  const half = Math.min(model.half, mock.half);
  return { total, lo: Math.max(400, total - half), hi: Math.min(1600, total + half) };
}

export const targetTheta = (targetSectionScore: number) => (targetSectionScore - 500) / SCORE_SLOPE;
export const sectionTarget = (targetTotal: number) => round10(targetTotal / 2);

/** Max official Math + max official R&W; only meaningful with >= 2 official attempts. */
export function superscore(attempts: { math: number; rw: number }[]) {
  if (attempts.length < 2) return null;
  const math = Math.max(...attempts.map((a) => a.math));
  const rw = Math.max(...attempts.map((a) => a.rw));
  return { math, rw, total: math + rw };
}

/* ───────── test results ───────── */

export type ResultItem = {
  section: "rw" | "math"; domain: string; skillId: string; difficulty: Difficulty;
  correct: boolean; answered: boolean; timeMs: number; mistakeType: string | null;
};
type SectionResult = { correct: number; total: number; route: string; score: number | null };
export type TestResult = {
  sections: Partial<Record<"rw" | "math", SectionResult>>;
  total: number | null;
  halfWidth: number;
  byDomain: Record<string, { correct: number; total: number }>;
  bySkill: Record<string, { correct: number; total: number; timeMs: number }>;
  timing: { avgMsEasy: number; avgMsMedium: number; avgMsHard: number; unanswered: number; rushedLast5: boolean };
  insights: string[];
};

const fmtTime = (ms: number) => `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * items in test order. `sectionMeta.route` is module 2's route; `scored` = full/section tests only
 * (mini/module/weakness/custom get raw results, never an invented 200–800 number).
 */
export function buildTestResult(
  items: ResultItem[], sectionMeta: Partial<Record<"rw" | "math", { route: string; scored: boolean }>>,
): TestResult {
  const sections: TestResult["sections"] = {};
  for (const sec of ["rw", "math"] as const) {
    const its = items.filter((i) => i.section === sec);
    const meta = sectionMeta[sec];
    if (!its.length || !meta) continue;
    const correct = its.filter((i) => i.correct).length;
    sections[sec] = {
      correct, total: its.length, route: meta.route,
      score: meta.scored ? mockSectionScore(correct, its.length, meta.route as "hard" | "easy" | "base") : null,
    };
  }
  const rw = sections.rw?.score, math = sections.math?.score;
  const total = rw != null && math != null ? rw + math : null;

  const byDomain: TestResult["byDomain"] = {};
  const bySkill: TestResult["bySkill"] = {};
  for (const i of items) {
    const d = (byDomain[i.domain] ??= { correct: 0, total: 0 });
    d.total++; if (i.correct) d.correct++;
    const s = (bySkill[i.skillId] ??= { correct: 0, total: 0, timeMs: 0 });
    s.total++; s.timeMs += i.timeMs; if (i.correct) s.correct++;
  }

  const ofDiff = (d: Difficulty) => items.filter((i) => i.difficulty === d);
  const unanswered = items.filter((i) => !i.answered).length;
  const last5 = items.slice(-5).filter((i) => i.answered);
  const lastSection = items.at(-1)?.section ?? "rw";
  const rushedLast5 = last5.length >= 3 && avg(last5.map((i) => i.timeMs)) < 0.35 * TARGET_SECONDS[lastSection] * 1000;
  const timing = {
    avgMsEasy: Math.round(avg(ofDiff(1).map((i) => i.timeMs))),
    avgMsMedium: Math.round(avg(ofDiff(2).map((i) => i.timeMs))),
    avgMsHard: Math.round(avg(ofDiff(3).map((i) => i.timeMs))),
    unanswered, rushedLast5,
  };

  // Insights, in priority order, max 4.
  const insights: string[] = [];
  if (unanswered >= 3) insights.push(`You ran out of time on ${unanswered} questions, so timing is costing you points.`);
  for (const sec of ["rw", "math"] as const) {
    const hard = items.filter((i) => i.section === sec && i.difficulty === 3);
    if (hard.length < 3) continue;
    const hardAvg = avg(hard.map((i) => i.timeMs));
    const hardAcc = hard.filter((i) => i.correct).length / hard.length;
    if (hardAvg > 1.6 * TARGET_SECONDS[sec] * 1000 && hardAcc < 0.5)
      insights.push(`Hard ${sec === "rw" ? "Reading and Writing" : "Math"} questions are taking too long (${fmtTime(hardAvg)} average).`);
  }
  const domains = Object.entries(byDomain).filter(([, v]) => v.total >= 4)
    .map(([id, v]) => ({ id, ...v, acc: v.correct / v.total }));
  if (domains.length >= 2) {
    const sorted = [...domains].sort((a, b) => a.acc - b.acc);
    const weak = sorted[0]!, strong = sorted.at(-1)!;
    const name = (id: string) => DOMAINS[id as DomainId]?.name ?? id;
    insights.push(`Weakest area: ${name(weak.id)} (${weak.correct}/${weak.total}).`);
    insights.push(`Strongest area: ${name(strong.id)} (${strong.correct}/${strong.total}).`);
  }
  const counts = new Map<string, number>();
  for (const i of items) if (!i.correct && i.mistakeType) counts.set(i.mistakeType, (counts.get(i.mistakeType) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 3) insights.push(`Most common mistake: ${MISTAKE_LABEL[top[0] as MistakeType] ?? top[0]}.`);
  // Most-missed skill (plan §17 "Most common mistake: Evidence questions").
  const missedBySkill = new Map<string, number>();
  // Only answered-and-wrong counts as missed: unanswered questions are the timing insight above, not a skill gap.
  for (const i of items) if (i.answered && !i.correct) missedBySkill.set(i.skillId, (missedBySkill.get(i.skillId) ?? 0) + 1);
  const worstSkill = [...missedBySkill.entries()].sort((a, b) => b[1] - a[1])[0];
  if (worstSkill && worstSkill[1] >= 3)
    insights.push(`Most-missed skill: ${SKILL_BY_ID[worstSkill[0]]?.name ?? worstSkill[0]} (${worstSkill[1]} wrong). Practice it next.`);
  const easy = ofDiff(1);
  const easyMissed = easy.filter((i) => i.answered && !i.correct).length;
  if (easy.length >= 3 && easyMissed / easy.length > 0.2)
    insights.push(`You missed ${easyMissed} easy questions. Slow down on the first read.`);

  const halfWidth = total != null ? round10(Math.SQRT2 * MOCK_HALF_WIDTH) : MOCK_HALF_WIDTH;
  return { sections, total, halfWidth, byDomain, bySkill, timing, insights: insights.slice(0, 4) };
}

/* ───────── time per question (results page) ───────── */

export type TimedItem = { section: "rw" | "math"; timeMs: number; correct: boolean; answered: boolean };
export type SectionTiming = {
  section: "rw" | "math"; questions: number; totalMs: number; avgMs: number; paceMs: number;
  avgCorrectMs: number | null; avgWrongMs: number | null;
  slow: number;   // took more than 1.5 times the SAT pace
  rushed: number; // answered wrong in under a third of the pace
};

/** Time stats per section against the real SAT pace, plus the slowest questions (1-based numbers in test order). */
export function timingStats(items: TimedItem[]) {
  const mean = (xs: number[]) => (xs.length ? Math.round(avg(xs)) : null);
  const sections: SectionTiming[] = (["rw", "math"] as const).flatMap((section) => {
    const its = items.filter((i) => i.section === section);
    if (!its.length) return [];
    const paceMs = TARGET_SECONDS[section] * 1000;
    const totalMs = its.reduce((a, i) => a + i.timeMs, 0);
    return [{
      section, questions: its.length, totalMs, avgMs: Math.round(totalMs / its.length), paceMs,
      avgCorrectMs: mean(its.filter((i) => i.correct).map((i) => i.timeMs)),
      avgWrongMs: mean(its.filter((i) => i.answered && !i.correct).map((i) => i.timeMs)),
      slow: its.filter((i) => i.timeMs > 1.5 * paceMs).length,
      rushed: its.filter((i) => i.answered && !i.correct && i.timeMs < paceMs / 3).length,
    }];
  });
  const slowest = items.map((i, k) => ({ n: k + 1, timeMs: i.timeMs })).sort((a, b) => b.timeMs - a.timeMs).slice(0, 3).filter((x) => x.timeMs > 0);
  return { totalMs: items.reduce((a, i) => a + i.timeMs, 0), sections, slowest };
}
