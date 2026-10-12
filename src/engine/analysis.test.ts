import { describe, expect, it } from "vitest";
import {
  accuracyChange, accuracyPct, avgSeconds, byDifficulty, groupSummaries, hasEnoughData, isValidDuration, MIN_SAMPLE,
  recommend, shareOfMistakes, summarize, type Bucket, type SkillRow,
} from "./analysis";

const b = (over: Partial<Bucket> = {}): Bucket => ({
  skillId: "m-alg-lin1", difficulty: 2, answered: 0, correct: 0, timedN: 0, timedMs: 0, ...over,
});

describe("accuracy", () => {
  it("is null with no answers, never 0 or NaN", () => {
    expect(accuracyPct(0, 0)).toBeNull();
    expect(summarize([]).accuracy).toBeNull();
  });
  it("rounds to a whole percent over answered questions only", () => {
    expect(accuracyPct(2, 3)).toBe(67);
    expect(accuracyPct(3, 3)).toBe(100);
  });
});

describe("durations", () => {
  it("treats null, NaN and missing values as invalid, not zero", () => {
    expect(isValidDuration(null)).toBe(false);
    expect(isValidDuration(undefined)).toBe(false);
    expect(isValidDuration(Number.NaN)).toBe(false);
  });
  it("excludes accidental taps under 1s and clamped attempts at the 10-minute cap", () => {
    expect(isValidDuration(999)).toBe(false);
    expect(isValidDuration(1000)).toBe(true);
    expect(isValidDuration(600_000)).toBe(false);
    expect(isValidDuration(599_999)).toBe(true);
  });
  it("averages only valid durations and reports null when there are none", () => {
    expect(avgSeconds(0, 0)).toBeNull();
    expect(avgSeconds(90_000, 3)).toBe(30);
    expect(avgSeconds(65_000, 2)).toBe(32.5);
  });
  it("summary average ignores buckets that have no valid timing", () => {
    const s = summarize([b({ answered: 4, correct: 2, timedN: 2, timedMs: 60_000 }), b({ answered: 5, correct: 5 })]);
    expect(s.avgSeconds).toBe(30);
    expect(s.timedN).toBe(2);
    expect(s.answered).toBe(9);
    expect(s.accuracy).toBe(78);
  });
});

describe("difficulty breakdown", () => {
  it("always returns Easy, Medium and Hard, even when empty", () => {
    const out = byDifficulty([]);
    expect(Object.keys(out).sort()).toEqual(["1", "2", "3"]);
    expect(out[3].accuracy).toBeNull();
  });
  it("splits buckets by difficulty", () => {
    const out = byDifficulty([b({ difficulty: 1, answered: 2, correct: 2 }), b({ difficulty: 3, answered: 4, correct: 1 })]);
    expect(out[1].accuracy).toBe(100);
    expect(out[2].answered).toBe(0);
    expect(out[3].accuracy).toBe(25);
  });
});

describe("grouping", () => {
  it("sums buckets that share a key and skips unclassified ones rather than guessing", () => {
    const groups = groupSummaries(
      [b({ skillId: "x", answered: 2, correct: 1 }), b({ skillId: "x", difficulty: 1, answered: 2, correct: 2 }), b({ skillId: "y", answered: 1 })],
      (bk) => (bk.skillId === "x" ? "X" : undefined),
    );
    expect([...groups.keys()]).toEqual(["X"]);
    expect(groups.get("X")!.answered).toBe(4);
  });
});

describe("sample size and shares", () => {
  it("does not treat a thin sample as enough to rank a skill", () => {
    expect(hasEnoughData(summarize([b({ answered: MIN_SAMPLE - 1 })]))).toBe(false);
    expect(hasEnoughData(summarize([b({ answered: MIN_SAMPLE })]))).toBe(true);
  });
  it("shares of mistakes are null with no mistakes and otherwise a percent of all mistakes", () => {
    const all = summarize([b({ answered: 10, correct: 6 })]);
    expect(shareOfMistakes(all, summarize([b({ answered: 10, correct: 10 })]))).toBeNull();
    expect(shareOfMistakes(summarize([b({ answered: 4, correct: 2 })]), all)).toBe(50);
  });
  it("accuracy change needs both periods", () => {
    const early = summarize([b({ answered: 10, correct: 5 })]);
    const late = summarize([b({ answered: 10, correct: 8 })]);
    expect(accuracyChange(early, late)).toBe(30);
    expect(accuracyChange(summarize([]), late)).toBeNull();
  });
});

describe("recommendations", () => {
  const target = { rw: 71, math: 95 };
  const row = (skillId: string, answered: number, correct: number, timedN = 0, timedMs = 0, section: "rw" | "math" = "math"): SkillRow =>
    ({ skillId, name: skillId, section, summary: summarize([b({ skillId, answered, correct, timedN, timedMs })]) });

  it("never ranks a skill on a thin sample", () => {
    expect(recommend([row("m-alg-lin1", MIN_SAMPLE - 1, 0)], target)).toEqual([]);
  });
  it("suggests targeted practice for low accuracy, weakest first", () => {
    const out = recommend([row("a", 10, 5), row("b", 10, 2), row("c", 10, 9)], target);
    expect(out.map((r) => r.skillId)).toEqual(["b", "a"]);
    expect(out[0]!.kind).toBe("practice");
    expect(out[0]!.reason).toContain("20% correct over 10 answers");
  });
  it("suggests timed work for accurate but slow skills, and only for the matching section", () => {
    const slow = row("m-geo-area", 10, 9, 10, 10 * 200_000, "math");
    const out = recommend([slow], target);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe("speed");
    expect(recommend([row("rw-cs-words", 10, 9, 10, 10 * 200_000, "rw")], target)[0]!.kind).toBe("speed");
    expect(recommend([row("m-geo-area", 10, 9, 10, 10 * 60_000)], target)).toEqual([]);
  });
});
