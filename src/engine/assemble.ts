// Build test modules from the bank by blueprint (spec 03 §7).
import { ROUTE_FRACTION, ROUTE_THRESHOLD, type Difficulty } from "./constants";

export type Route = "base" | "hard" | "easy";
export type Blueprint = {
  section: "rw" | "math"; count: number; timeLimitS: number | null;
  domainCounts: Record<string, number>; difficultyCounts: Record<Difficulty, number>;
};

const RW_DOMAINS = { "rw-cs": 8, "rw-ii": 7, "rw-sec": 7, "rw-ei": 5 };
const MATH_DOMAINS = { "m-alg": 8, "m-adv": 7, "m-psda": 4, "m-geo": 3 };
const MIX: Record<"rw" | "math", Record<Route, Record<Difficulty, number>>> = {
  rw:   { base: { 1: 8, 2: 11, 3: 8 }, hard: { 1: 3, 2: 9, 3: 15 }, easy: { 1: 15, 2: 9, 3: 3 } },
  math: { base: { 1: 7, 2: 8, 3: 7 },  hard: { 1: 2, 2: 8, 3: 12 }, easy: { 1: 12, 2: 8, 3: 2 } },
};
export const RW_DOMAIN_ORDER = ["rw-cs", "rw-ii", "rw-sec", "rw-ei"];

export function moduleBlueprint(section: "rw" | "math", route: Route, timed = true): Blueprint {
  return section === "rw"
    ? { section, count: 27, timeLimitS: timed ? 32 * 60 : null, domainCounts: RW_DOMAINS, difficultyCounts: MIX.rw[route] }
    : { section, count: 22, timeLimitS: timed ? 35 * 60 : null, domainCounts: MATH_DOMAINS, difficultyCounts: MIX.math[route] };
}

export function routeFor(section: "rw" | "math", correct: number, total: number): "hard" | "easy" {
  const full = section === "rw" ? 27 : 22;
  const threshold = total < full ? Math.ceil(ROUTE_FRACTION * total) : ROUTE_THRESHOLD[section];
  return correct >= threshold ? "hard" : "easy";
}

/** Split `total` across `weights` with integers that sum exactly to `total`. */
export function largestRemainder(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (w * total) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const byFrac = raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f || a.i - b.i);
  for (const { i } of byFrac) { if (left-- <= 0) break; out[i]!++; }
  return out;
}

export type PoolQ = {
  id: string; skillId: string; domain: string; difficulty: Difficulty; type: "mcq" | "spr"; lastSeenAt: Date | null;
};

/**
 * Pool = active questions already narrowed by the caller (to a section, skill, or skill list).
 * Never throws on a thin pool; returns as many as exist up to bp.count.
 */
export function assembleModule<T extends PoolQ>(
  bp: Blueprint, pool: T[], excludeIds: ReadonlySet<string>, rng: () => number,
): T[] {
  // Freshness order: shuffle (tie-break), then stable sort unseen first, then least recently seen.
  const ordered = pool.filter((q) => !excludeIds.has(q.id));
  for (let i = ordered.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ordered[i], ordered[j]] = [ordered[j]!, ordered[i]!];
  }
  ordered.sort((a, b) => (a.lastSeenAt?.getTime() ?? -Infinity) - (b.lastSeenAt?.getTime() ?? -Infinity));

  const used = new Set<string>();
  // Round-robin across skills, unseen tier before seen tier.
  const take = (n: number, pred: (q: T) => boolean): T[] => {
    const out: T[] = [];
    for (const tier of [true, false]) {
      const bySkill = new Map<string, T[]>();
      for (const q of ordered) {
        if (used.has(q.id) || (q.lastSeenAt === null) !== tier || !pred(q)) continue;
        const group = bySkill.get(q.skillId);
        if (group) group.push(q);
        else bySkill.set(q.skillId, [q]);
      }
      const queues = [...bySkill.values()];
      while (out.length < n && queues.some((qs) => qs.length)) {
        for (const qs of queues) {
          if (out.length >= n) break;
          const q = qs.shift();
          if (q) { out.push(q); used.add(q.id); }
        }
      }
    }
    return out;
  };

  const result: T[] = [];
  const short: { domain: string; d: Difficulty; n: number }[] = [];
  const diffs: Difficulty[] = [1, 2, 3];
  for (const [domain, c] of Object.entries(bp.domainCounts)) {
    const quotas = largestRemainder(c, diffs.map((d) => bp.difficultyCounts[d]));
    diffs.forEach((d, i) => {
      const got = take(quotas[i]!, (q) => q.domain === domain && q.difficulty === d);
      result.push(...got);
      if (got.length < quotas[i]!) short.push({ domain, d, n: quotas[i]! - got.length });
    });
  }
  // Borrow: adjacent difficulty in the same domain first...
  for (const s of short) {
    for (const alt of diffs.filter((x) => x !== s.d).sort((a, b) => Math.abs(a - s.d) - Math.abs(b - s.d))) {
      const got = take(s.n, (q) => q.domain === s.domain && q.difficulty === alt);
      result.push(...got);
      s.n -= got.length;
    }
  }
  // ...then anything left in the pool.
  result.push(...take(bp.count - result.length, () => true));

  // Full math modules: aim for 5–6 SPR by swapping within the same (domain, difficulty) cell.
  if (bp.section === "math" && bp.count >= 20) {
    const swap = (from: "mcq" | "spr", to: "mcq" | "spr", needed: number) => {
      for (let i = result.length - 1; i >= 0 && needed > 0; i--) {
        const q = result[i]!;
        if (q.type !== from) continue;
        const alt = ordered.find((a) => !used.has(a.id) && a.type === to && a.domain === q.domain && a.difficulty === q.difficulty);
        if (!alt) continue;
        used.add(alt.id);
        result[i] = alt;
        needed--;
      }
    };
    const spr = result.filter((q) => q.type === "spr").length;
    if (spr < 5) swap("mcq", "spr", 5 - spr);
    if (spr > 6) swap("spr", "mcq", spr - 6);
  }

  // Order like the real test.
  const tie = new Map(result.map((q) => [q.id, rng()]));
  if (bp.section === "rw") {
    const di = (d: string) => { const i = RW_DOMAIN_ORDER.indexOf(d); return i < 0 ? 99 : i; };
    result.sort((a, b) => di(a.domain) - di(b.domain) || a.difficulty - b.difficulty || tie.get(a.id)! - tie.get(b.id)!);
  } else {
    result.sort((a, b) => a.difficulty - b.difficulty || tie.get(a.id)! - tie.get(b.id)!);
  }
  return result;
}
