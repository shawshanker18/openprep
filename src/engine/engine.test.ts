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
import { buildTestResult, mockSectionScore, sectionEstimate, timingStats } from "./score";
import { buildDailyPlan, streak, weekOf } from "./plan";

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

describe("board prior", () => {
  it("board-implied is a smaller nudge than a ticked topic", () => {
    const base = { selfRating: 1 as SelfRating, priorSectionScore: null };
    const none = priorTheta({ ...base, topicStudied: false });
    const board = priorTheta({ ...base, topicStudied: false, boardImplied: true });
    const ticked = priorTheta({ ...base, topicStudied: true });
    expect(none).toBeLessThan(board);
    expect(board).toBeLessThan(ticked);
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
  it("a single-difficulty blueprint fills from that difficulty, then borrows the nearest", () => {
    const pool = makePool("math", 2).filter((q) => q.skillId === "m-geo-circles"); // 2 per difficulty
    const bp = { section: "math" as const, count: 4, timeLimitS: null, domainCounts: { "m-geo": 4 }, difficultyCounts: { 1: 0, 2: 0, 3: 1 } };
    const m = assembleModule(bp, pool, new Set(), rngFrom(4));
    expect(m.map((q) => q.difficulty).sort()).toEqual([2, 2, 3, 3]);
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
      expect(p.reduce((a, b) => a + b.minutes, 0)).toBe(minutes); // exactly the student's time, never over or under
      expect(p.length).toBeGreaterThan(0);
      expect(p.every((b) => b.minutes >= 5)).toBe(true);
    }
  });
  it("a long learn slot is split into the lesson + practice on the same skill", () => {
    const p = buildDailyPlan({ minutes: 60, dueReviews: 0, focus: focus(3).map((f) => ({ ...f, lessonDone: false, masteryPct: 20 })), nextDesmosLesson: null, dayOfWeekIndex: 1 });
    expect(p[0]).toMatchObject({ kind: "learn", minutes: 15 });
    expect(p[1]).toMatchObject({ kind: "practice", skillId: p[0]!.kind === "learn" ? p[0]!.skillId : "" });
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

describe("readyBy", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  it("already at target → just the buffer; 45 min × 5 days for +300 → about 22 weeks", async () => {
    const { readyBy } = await import("./plan");
    expect(readyBy({ estimate: 1400, target: 1400, minutesPerDay: 45, daysPerWeek: 5, now })!.weeks).toBe(2);
    expect(readyBy({ estimate: 1100, target: 1400, minutesPerDay: 45, daysPerWeek: 5, now })!.weeks).toBe(22);
    expect(readyBy({ estimate: 400, target: 1600, minutesPerDay: 15, daysPerWeek: 3, now })).toBeNull(); // > 2 years
  });
  it("predicted score agrees with it: test on the ready date → at least the target; never below now or above 1600", async () => {
    const { readyBy, predictedScore } = await import("./plan");
    const study = { minutesPerDay: 45, daysPerWeek: 5 };
    const r = readyBy({ estimate: 1100, target: 1400, ...study, now })!;
    expect(predictedScore({ estimate: 1100, ...study, daysLeft: r.weeks * 7 })).toBeGreaterThanOrEqual(1400);
    expect(predictedScore({ estimate: 1100, ...study, daysLeft: (r.weeks - 4) * 7 })).toBeLessThan(1400);
    expect(predictedScore({ estimate: 1100, ...study, daysLeft: 3 })).toBe(1100); // inside the final-mock buffer
    expect(predictedScore({ estimate: 1100, ...study, daysLeft: -10 })).toBe(1100); // test date passed
    expect(predictedScore({ estimate: 1500, minutesPerDay: 120, daysPerWeek: 7, daysLeft: 365 })).toBe(1600);
  });
});

describe("plan near the test date", () => {
  const focus = (lessonDone: boolean, attemptsThisWeek = 0) => SKILLS.slice(0, 3).map((s) => ({
    skillId: s.id, section: s.section, masteryPct: 30, lessonDone, attemptsThisWeek,
  }));
  const base = { dueReviews: 3, nextDesmosLesson: null, dayOfWeekIndex: 1 };
  it("≤ 28 days: first practice block ≥ 15 min becomes a mini check-in; budget respected; deterministic", () => {
    for (const minutes of [15, 30, 45, 60, 90, 120]) for (const daysToTest of [null, 40, 28, 7, 0]) {
      const input = { ...base, minutes, focus: focus(true), daysToTest };
      const p = buildDailyPlan(input);
      expect(p.reduce((a, b) => a + b.minutes, 0)).toBe(minutes);
      expect(buildDailyPlan(input)).toEqual(p);
      const minis = p.filter((b) => b.kind === "mini");
      const firstPractice = p.find((b) => b.kind === "practice" || b.kind === "mini");
      if (daysToTest != null && daysToTest <= 28 && firstPractice && firstPractice.minutes >= 15) expect(firstPractice.kind).toBe("mini");
      if (daysToTest == null || daysToTest > 28) expect(minis).toHaveLength(0);
      expect(minis.length).toBeLessThanOrEqual(1);
    }
  });
  it("≤ 7 days: no learn blocks, review kept", () => {
    const far = buildDailyPlan({ ...base, minutes: 60, focus: focus(false), daysToTest: 30 });
    expect(far.some((b) => b.kind === "learn")).toBe(true);
    const near = buildDailyPlan({ ...base, minutes: 60, focus: focus(false), daysToTest: 5 });
    expect(near.some((b) => b.kind === "learn")).toBe(false);
    expect(near.some((b) => b.kind === "review")).toBe(true);
    expect(near.some((b) => b.kind === "mini")).toBe(true);
  });
  it("a past test date is ignored", () => {
    const input = { ...base, minutes: 60, focus: focus(false) };
    expect(buildDailyPlan({ ...input, daysToTest: -3 })).toEqual(buildDailyPlan(input));
  });
});

describe("streak", () => {
  it("counts back from today, or from yesterday if today has no practice yet", () => {
    expect(streak(["2026-10-01", "2026-09-30", "2026-09-29", "2026-09-27"], "2026-10-01")).toBe(3);
    expect(streak(["2026-09-30", "2026-09-29"], "2026-10-01")).toBe(2);
    expect(streak(["2026-09-29"], "2026-10-01")).toBe(0);
    expect(streak([], "2026-10-01")).toBe(0);
    expect(streak(["2026-03-01", "2026-02-28"], "2026-03-01")).toBe(2); // month boundary
  });
});

describe("course", async () => {
  const { levelOf, unitSteps, points, checkCount } = await import("./course");
  it("levels: nothing answered is not started; otherwise follows the mastery status", () => {
    expect(levelOf(0, "mastered")).toBe("not-started");
    expect(levelOf(3, "weak")).toBe("attempted");
    expect(levelOf(3, "developing")).toBe("familiar");
    expect(levelOf(3, "strong")).toBe("proficient");
    expect(levelOf(3, "mastered")).toBe("mastered");
  });
  it("every skill appears once, quizzes cover their group, and the unit test covers the whole unit", () => {
    for (const d of Object.keys(DOMAINS) as DomainId[]) {
      const steps = unitSteps(d);
      const skills = steps.filter((s) => s.kind === "skill");
      expect(skills.length).toBe(skillsIn(d).length);
      expect(steps.at(-1)).toMatchObject({ kind: "unit-test" });
      const quizzed = steps.flatMap((s) => (s.kind === "quiz" ? s.skills.map((k) => k.id) : []));
      if (skillsIn(d).length > 3) expect(new Set(quizzed).size).toBe(skillsIn(d).length);
    }
  });
  it("points and question counts", () => {
    expect(points(["mastered", "familiar", "not-started"])).toEqual({ earned: 150, max: 300 });
    expect(checkCount("quiz", 3)).toBe(6);
    expect(checkCount("unit-test", 5)).toBe(15);
    expect(checkCount("challenge", 29)).toBe(30);
  });
});

describe("timing stats", () => {
  it("compares each section with the SAT pace and finds slow, rushed and slowest questions", () => {
    const t = timingStats([
      { section: "math", timeMs: 200_000, correct: true, answered: true },  // slow (over 1.5 × 95s)
      { section: "math", timeMs: 20_000, correct: false, answered: true },  // rushed (under 95s / 3)
      { section: "math", timeMs: 90_000, correct: true, answered: true },
      { section: "rw", timeMs: 60_000, correct: false, answered: false },   // blank: neither wrong nor rushed
    ]);
    expect(t.totalMs).toBe(370_000);
    const math = t.sections.find((s) => s.section === "math")!;
    expect(math).toMatchObject({ questions: 3, avgMs: 103_333, paceMs: 95_000, avgCorrectMs: 145_000, avgWrongMs: 20_000, slow: 1, rushed: 1 });
    expect(t.sections.find((s) => s.section === "rw")).toMatchObject({ questions: 1, avgWrongMs: null, rushed: 0 });
    expect(t.slowest.map((x) => x.n)).toEqual([1, 3, 4]);
  });
});
