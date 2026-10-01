import { describe, expect, it } from "vitest";
import { DOMAINS, SKILLS, skillsIn, skillWeight, type DomainId } from "@/content/taxonomy";
import type { Difficulty } from "./constants";
import { applyDelta, kFactor, masteryPct, sigma, thetaDelta } from "./mastery";
import { priorTheta, type SelfRating } from "./prior";
import { grade, gradeSpr } from "./grade";
import { DIAGNOSTIC_LENGTH, DOMAIN_ORDER, nextDiagnosticSpec, type DiagAnswered } from "./diagnostic";
import { pickQuestion, skillPriority, weeklyFocus, type Candidate } from "./select";
import { afterReview } from "./review";
import { assembleModule, largestRemainder, moduleBlueprint, RW_DOMAIN_ORDER, type PoolQ } from "./assemble";
import { buildTestResult, mockSectionScore, sectionEstimate } from "./score";
import { buildDailyPlan, weekOf } from "./plan";

// Deterministic RNG for tests (mulberry32).
const rngFrom = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe("taxonomy", () => {
  it("has 29 unique skills whose weights sum to 1 per section", () => {
    expect(SKILLS).toHaveLength(29);
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(29);
    for (const sec of ["rw", "math"]) {
      const sum = SKILLS.filter((s) => s.section === sec).reduce((a, s) => a + skillWeight(s), 0);
      expect(sum).toBeCloseTo(1, 9);
    }
  });
});

describe("mastery", () => {
  const run = (steps: [Difficulty, boolean][]) => {
    let theta = 0;
    steps.forEach(([d, c], n) => { theta = applyDelta(theta, thetaDelta(theta, n, d, true, c)); });
    return theta;
  };
  it("matches the worked numbers", () => {
    expect(run([[2, true]])).toBeCloseTo(0.375, 2);
    expect(run([[2, true], [3, true]])).toBeCloseTo(0.809, 2);
    expect(run([[2, true], [3, true], [3, true]])).toBeCloseTo(1.128, 2);
    expect(masteryPct(run([[2, true], [3, true], [3, true]]))).toBe(76);
    expect(run([[2, false]])).toBeCloseTo(-0.625, 2);
    expect(run([[2, false], [1, false]])).toBeCloseTo(-1.233, 2);
    expect(run([[2, false], [1, false], [1, false]])).toBeCloseTo(-1.676, 2);
    expect(masteryPct(run([[2, false], [1, false], [1, false]]))).toBe(16);
  });
  it("keeps theta in [-3, 3] and moves in the right direction", () => {
    let hi = 0, lo = 0;
    for (let n = 0; n < 200; n++) {
      const up = thetaDelta(hi, n, 1, false, true);
      const down = thetaDelta(lo, n, 3, true, false);
      expect(up).toBeGreaterThan(0);
      expect(down).toBeLessThan(0);
      hi = applyDelta(hi, up); lo = applyDelta(lo, down);
    }
    expect(hi).toBeLessThanOrEqual(3);
    expect(lo).toBeGreaterThanOrEqual(-3);
  });
  it("kFactor is non-increasing and floored", () => {
    for (let n = 0; n < 100; n++) {
      expect(kFactor(n + 1)).toBeLessThanOrEqual(kFactor(n));
      expect(kFactor(n)).toBeGreaterThanOrEqual(0.2);
    }
  });
});

describe("prior", () => {
  it("stays in [-2, 2] and is monotone in self-rating", () => {
    for (const topic of [true, false]) for (const score of [null, 200, 500, 800]) {
      let prev = -Infinity;
      for (const r of [0, 1, 2, 3] as SelfRating[]) {
        const p = priorTheta({ selfRating: r, topicStudied: topic, priorSectionScore: score });
        expect(p).toBeGreaterThanOrEqual(-2);
        expect(p).toBeLessThanOrEqual(2);
        expect(p).toBeGreaterThanOrEqual(prev);
        prev = p;
      }
    }
  });
});

describe("grade", () => {
  it("grades MCQ by exact choice", () => {
    expect(grade({ answer: { choice: "B" } }, "B")).toBe(true);
    expect(grade({ answer: { choice: "B" } }, "C")).toBe(false);
  });
  it("applies SAT SPR rules", () => {
    for (const ok of ["2/3", ".6666", ".6667", "0.666", "0.667", "4/6"]) expect(gradeSpr(ok, ["2/3"]), ok).toBe(true);
    for (const bad of ["0.66", "0.67", ".6", "abc", ""]) expect(gradeSpr(bad, ["2/3"]), bad).toBe(false);
    expect(gradeSpr("-3", ["-3"])).toBe(true);
    expect(gradeSpr("-3.0", ["-3"])).toBe(true);
    expect(gradeSpr("3", ["3", "-3"])).toBe(true);
    expect(gradeSpr("-3", ["3", "-3"])).toBe(true);
    expect(gradeSpr("1/0", ["0"])).toBe(false);
  });
});

describe("diagnostic", () => {
  const byDomain = Object.fromEntries(Object.keys(DOMAINS).map((d) => [d, skillsIn(d).map((s) => s.id)]));
  const simulate = (answer: (i: number) => boolean) => {
    const answered: DiagAnswered[] = [];
    for (;;) {
      const spec = nextDiagnosticSpec(answered, {}, byDomain);
      if (!spec) break;
      answered.push({ ...spec, correct: answer(answered.length) });
    }
    return answered;
  };
  it("asks 24 questions in domain order then stops", () => {
    const a = simulate(() => true);
    expect(a).toHaveLength(DIAGNOSTIC_LENGTH);
    expect(a.map((x) => x.domain)).toEqual(DOMAIN_ORDER.flatMap((d) => [d, d, d]));
  });
  it("staircases within 1..3", () => {
    const up = simulate(() => true).filter((x) => x.domain === "m-alg").map((x) => x.difficulty);
    expect(up).toEqual([2, 3, 3]);
    const down = simulate(() => false).filter((x) => x.domain === "m-alg").map((x) => x.difficulty);
    expect(down).toEqual([2, 1, 1]);
  });
  it("samples 3 different skills where the domain has >= 3", () => {
    const a = simulate((i) => i % 2 === 0);
    for (const d of DOMAIN_ORDER) if (skillsIn(d).length >= 3)
      expect(new Set(a.filter((x) => x.domain === d).map((x) => x.skillId)).size).toBe(3);
  });
});

describe("select", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
  it("priority is 0 at or above target", () => {
    expect(skillPriority({ weight: 0.1, theta: 1, targetTheta: 1 })).toBe(0);
    expect(skillPriority({ weight: 0.1, theta: 2, targetTheta: 1 })).toBe(0);
    expect(skillPriority({ weight: 0.1, theta: 0, targetTheta: 1 })).toBeCloseTo(0.1);
  });
  it("prefers unseen, then least recently seen; null on empty", () => {
    const c = (id: string, d: Difficulty, seen: Date | null): Candidate => ({ id, difficulty: d, lastSeenAt: seen, tags: [] });
    expect(pickQuestion([c("seen", 2, daysAgo(20)), c("unseen", 3, null)], 2, now, rngFrom(1))!.id).toBe("unseen");
    expect(pickQuestion([c("recent", 2, daysAgo(1)), c("old", 2, daysAgo(10))], 2, now, rngFrom(1))!.id).toBe("old");
    expect(pickQuestion([], 2, now, rngFrom(1))).toBeNull();
  });
  it("weekly focus: 3 skills, max 2 per section", () => {
    const skills = SKILLS.map((s, i) => ({ skillId: s.id, section: s.section, order: i, weight: skillWeight(s), theta: -1, n: 0, targetTheta: 1 }));
    const f = weeklyFocus(skills);
    expect(f).toHaveLength(3);
    const secs = f.map((id) => SKILLS.find((s) => s.id === id)!.section);
    expect(secs.filter((s) => s === "rw").length).toBeLessThanOrEqual(2);
    expect(secs.filter((s) => s === "math").length).toBeLessThanOrEqual(2);
  });
});

describe("review", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  it("wrong resets to stage 0 at +1d; three corrects finish", () => {
    const r = afterReview(2, false, now);
    expect(r).toEqual({ stage: 0, dueAt: new Date("2026-10-02T00:00:00Z") });
    let stage = 0;
    for (let i = 0; i < 2; i++) { const x = afterReview(stage, true, now); if (x === "done") throw new Error(); stage = x.stage; }
    expect(afterReview(stage, true, now)).toBe("done");
  });
});

describe("assemble", () => {
  const makePool = (section: "rw" | "math", perCell: number): PoolQ[] => {
    const out: PoolQ[] = [];
    for (const s of SKILLS.filter((k) => k.section === section))
      for (const d of [1, 2, 3] as Difficulty[])
        for (let i = 0; i < perCell; i++)
          out.push({ id: `${s.id}-${d}-${i}`, skillId: s.id, domain: s.domain, difficulty: d,
            type: section === "math" && i % 4 === 0 ? "spr" : "mcq", lastSeenAt: null });
    return out;
  };
  it("hits exact counts and domain counts with no duplicates", () => {
    for (const section of ["rw", "math"] as const) for (const route of ["base", "hard", "easy"] as const) {
      const bp = moduleBlueprint(section, route);
      const m = assembleModule(bp, makePool(section, 10), new Set(), rngFrom(7));
      expect(m).toHaveLength(bp.count);
      expect(new Set(m.map((q) => q.id)).size).toBe(bp.count);
      for (const [d, c] of Object.entries(bp.domainCounts)) expect(m.filter((q) => q.domain === d)).toHaveLength(c);
      if (section === "math") {
        const spr = m.filter((q) => q.type === "spr").length;
        expect(spr).toBeGreaterThanOrEqual(5);
        expect(spr).toBeLessThanOrEqual(6);
      }
    }
  });
  it("respects excludeIds", () => {
    const pool = makePool("rw", 10);
    const exclude = new Set(pool.slice(0, 200).map((q) => q.id));
    const m = assembleModule(moduleBlueprint("rw", "base"), pool, exclude, rngFrom(3));
    expect(m.some((q) => exclude.has(q.id))).toBe(false);
  });
  it("degrades on a tiny pool without throwing", () => {
    const pool = makePool("math", 1).slice(0, 10);
    const m = assembleModule(moduleBlueprint("math", "hard"), pool, new Set(), rngFrom(3));
    expect(m).toHaveLength(10);
    expect(assembleModule(moduleBlueprint("math", "hard"), [], new Set(), rngFrom(3))).toEqual([]);
  });
  it("orders R&W by domain then easy→hard, math easy→hard", () => {
    const rw = assembleModule(moduleBlueprint("rw", "base"), makePool("rw", 10), new Set(), rngFrom(5));
    const key = (q: PoolQ) => RW_DOMAIN_ORDER.indexOf(q.domain) * 10 + q.difficulty;
    expect(rw.map(key)).toEqual([...rw.map(key)].sort((a, b) => a - b));
    const math = assembleModule(moduleBlueprint("math", "base"), makePool("math", 10), new Set(), rngFrom(5));
    expect(math.map((q) => q.difficulty)).toEqual([...math.map((q) => q.difficulty)].sort());
  });
  it("prefers unseen questions", () => {
    const pool = makePool("rw", 10).map((q, i) => ({ ...q, lastSeenAt: i % 2 ? new Date() : null }));
    const m = assembleModule(moduleBlueprint("rw", "base"), pool, new Set(), rngFrom(9));
    expect(m.every((q) => q.lastSeenAt === null)).toBe(true);
  });
  it("largestRemainder sums exactly", () => {
    expect(largestRemainder(7, [8, 11, 8]).reduce((a, b) => a + b)).toBe(7);
    expect(largestRemainder(0, [1, 1, 1])).toEqual([0, 0, 0]);
  });
});

describe("score", () => {
  it("mock section score endpoints", () => {
    expect(mockSectionScore(54, 54, "hard")).toBe(800);
    expect(mockSectionScore(0, 54, "easy")).toBe(200);
    expect(mockSectionScore(54, 54, "easy")).toBe(620);
  });
  it("estimates are multiples of 10 in range; range narrows with evidence", () => {
    let prevHalf = Infinity;
    for (const n of [0, 5, 20, 100]) {
      for (const theta of [-3, 0, 3]) {
        const e = sectionEstimate(SKILLS.map((s) => ({ skillId: s.id, theta, n })), "math");
        expect(e.score % 10).toBe(0);
        expect(e.score).toBeGreaterThanOrEqual(200);
        expect(e.score).toBeLessThanOrEqual(800);
      }
      const { half } = sectionEstimate(SKILLS.map((s) => ({ skillId: s.id, theta: 0, n })), "rw");
      expect(half).toBeLessThanOrEqual(prevHalf);
      prevHalf = half;
    }
  });
  it("buildTestResult scores full sections and emits insights", () => {
    const items = Array.from({ length: 44 }, (_, i) => ({
      section: "math" as const, domain: "m-alg", skillId: "m-alg-lin1", difficulty: ((i % 3) + 1) as Difficulty,
      correct: i % 2 === 0, answered: i < 40, timeMs: 60_000, mistakeType: i % 2 ? "careless" : null,
    }));
    const r = buildTestResult(items, { math: { route: "hard", scored: true } });
    expect(r.sections.math).toEqual({ correct: 22, total: 44, route: "hard", score: 500 });
    expect(r.total).toBeNull();
    expect(r.timing.unanswered).toBe(4);
    expect(r.insights[0]).toMatch(/ran out of time on 4/);
    expect(r.insights.length).toBeLessThanOrEqual(4);
  });
  it("unscored tests get no scaled score", () => {
    const r = buildTestResult([{ section: "rw", domain: "rw-ii", skillId: "rw-ii-central", difficulty: 1, correct: true, answered: true, timeMs: 1, mistakeType: null }],
      { rw: { route: "base", scored: false } });
    expect(r.sections.rw!.score).toBeNull();
  });
});

describe("plan", () => {
  const focus = (n: number) => SKILLS.slice(0, n).map((s) => ({
    skillId: s.id, section: s.section, masteryPct: 50, lessonDone: true, attemptsThisWeek: 25,
  }));
  it("stays within budget for all budgets", () => {
    for (const minutes of [15, 30, 45, 60, 90, 120]) for (const due of [0, 5]) for (const dow of [0, 1]) {
      const p = buildDailyPlan({ minutes, dueReviews: due, focus: focus(3), nextDesmosLesson: "graphing-basics", dayOfWeekIndex: dow });
      expect(p.reduce((a, b) => a + b.minutes, 0)).toBeLessThanOrEqual(minutes + 5);
      expect(p.length).toBeGreaterThan(0);
    }
  });
  it("no review block when nothing is due; deterministic", () => {
    const input = { minutes: 45, dueReviews: 0, focus: focus(3), nextDesmosLesson: null, dayOfWeekIndex: 2 };
    const p = buildDailyPlan(input);
    expect(p.some((b) => b.kind === "review")).toBe(false);
    expect(buildDailyPlan(input)).toEqual(p);
  });
  it("weekOf returns the Monday", () => {
    expect(weekOf("2026-10-01")).toBe("2026-09-28"); // Thursday → Monday
    expect(weekOf("2026-09-28")).toBe("2026-09-28");
  });
});

describe("misc", () => {
  it("sigma shrinks with evidence", () => expect(sigma(20)).toBeLessThan(sigma(0)));
  it("every domain id in DOMAIN_ORDER exists", () => DOMAIN_ORDER.forEach((d) => expect(DOMAINS[d as DomainId]).toBeDefined()));
});
