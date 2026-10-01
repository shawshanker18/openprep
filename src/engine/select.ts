// Which skill, then which question (spec 03 §5).
import type { Difficulty } from "./constants";

export function skillPriority(x: { weight: number; theta: number; targetTheta: number }): number {
  return x.weight * Math.max(0, x.targetTheta - x.theta);
}

export type FocusInput = {
  skillId: string; section: "rw" | "math"; order: number; // order = global taxonomy index
  weight: number; theta: number; n: number; targetTheta: number;
};

/** Top 3 by priority, max 2 per section. If nothing has a gap: the 3 lowest-theta skills. */
export function weeklyFocus(skills: FocusInput[]): string[] {
  const withP = skills.map((s) => ({ ...s, p: skillPriority(s) }));
  const anyGap = withP.some((s) => s.p > 0);
  const sorted = anyGap
    ? withP.sort((a, b) => b.p - a.p || a.n - b.n || a.order - b.order)
    : withP.sort((a, b) => a.theta - b.theta || a.order - b.order);
  const picked: typeof sorted = [];
  for (const s of sorted) {
    if (picked.length === 3) break;
    if (picked.filter((p) => p.section === s.section).length < 2) picked.push(s);
  }
  return picked.map((s) => s.skillId);
}

export function targetDifficulty(theta: number, rng: () => number): Difficulty {
  // aim for ~70% success; 20% of the time ask one level harder
  const base: Difficulty = theta < -0.2 ? 1 : theta < 1.0 ? 2 : 3;
  return (rng() < 0.2 ? Math.min(3, base + 1) : base) as Difficulty;
}

export type Candidate = { id: string; difficulty: Difficulty; lastSeenAt: Date | null; tags: string[] };

export function pickQuestion<T extends Candidate>(
  candidates: T[], want: Difficulty, now: Date, rng: () => number, preferTags: string[] = [],
): T | null {
  if (candidates.length === 0) return null;
  const DAY = 86_400_000;
  const scored = candidates.map((c) => {
    const unseen = c.lastSeenAt === null ? 100 : 0;
    const stale = c.lastSeenAt ? Math.min(30, (now.getTime() - c.lastSeenAt.getTime()) / DAY) : 0;
    const diff = -40 * Math.abs(c.difficulty - want);
    const tag = c.tags.some((t) => preferTags.includes(t)) ? 15 : 0;
    return { c, score: unseen + stale + diff + tag + rng() }; // rng() only breaks ties
  });
  return scored.reduce((best, x) => (x.score > best.score ? x : best)).c;
}
