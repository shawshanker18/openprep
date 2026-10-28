import { describe, expect, it } from "vitest";
import { daysThroughExam, planEnding, layout, outrightCents, parseChoice, quote, remainingMs, tierAt, withDays, type Block } from "@/lib/membership";

const now = new Date("2026-03-01T00:00:00Z");
const day = 86_400_000;
const at = (d: number) => new Date(now.getTime() + d * day);
const block = (tier: "plus" | "pro", from: number, to: number): Block => ({ tier, startsAt: at(from), endsAt: at(to) });

describe("quote", () => {
  it("prices fixed periods", () => {
    expect(quote("plus", "monthly", null, now)).toEqual({ days: 30, cents: 700 });
    expect(quote("pro", "quarterly", null, now)).toEqual({ days: 90, cents: 3200 });
    expect(quote("plus", "quarterly", null, now)).toEqual({ days: 90, cents: 1500 });
  });
  it("only sells official SAT dates that have not passed", () => {
    expect(quote("plus", "until_test", null, now)).toBeNull();
    expect(quote("plus", "until_test", "2026-02-28", now)).toBeNull();
    expect(parseChoice("until_test:2027-03-06")).toEqual({ billing: "until_test", exam: "2027-03-06" });
    expect(parseChoice("until_test:2027-03-07")).toBeNull();
    expect(parseChoice("until_test")).toBeNull();
    expect(parseChoice("monthly")).toEqual({ billing: "monthly", exam: null });
    expect(parseChoice("monthly:2027-03-06")).toBeNull();
  });
  it("runs through the day after the exam", () => {
    expect(daysThroughExam("2026-03-01", now)).toBe(2); // exam today: today and tomorrow
    expect(daysThroughExam("2026-03-10", now)).toBe(11);
    expect(daysThroughExam("2026-02-28", now)).toBeNull();
  });
  it("costs a little less than buying the same months outright", () => {
    expect(outrightCents("plus", 11)).toBe(700);
    expect(outrightCents("plus", 31)).toBe(1400);
    expect(outrightCents("plus", 85)).toBe(1500); // one 3-month pack beats three 30-day packs
    expect(outrightCents("pro", 120)).toBe(3200 + 1500);
    expect(quote("plus", "until_test", "2026-12-05", new Date("2026-10-30T00:00:00Z"))).toEqual({ days: 38, cents: 1250 }); // 2 months outright = 1400, less 10% = 1260, nearest 50 cents
  });
});

describe("membership blocks", () => {
  it("queues Plus after a fresh Pro period on upgrade", () => {
    const plus = [block("plus", 0, 12)];
    const next = withDays(plus, "pro", 30, now);
    expect(next.map((b) => [b.tier, (b.endsAt.getTime() - b.startsAt.getTime()) / day])).toEqual([["pro", 30], ["plus", 12]]);
    expect(tierAt(next, at(1))).toBe("pro");
    expect(tierAt(next, at(31))).toBe("plus");
    expect(tierAt(next, at(43))).toBe("free");
  });
  it("renewing adds days to that tier and keeps the order", () => {
    const next = withDays([block("pro", 0, 10), block("plus", 10, 20)], "plus", 30, now);
    expect(remainingMs(next, now)).toEqual({ pro: 10 * day, plus: 40 * day });
    expect(next[0]!.tier).toBe("pro");
  });
  it("counts only what is left, and never goes below zero", () => {
    const later = at(5);
    expect(remainingMs([block("plus", 0, 12)], later).plus).toBe(7 * day);
    expect(withDays([block("plus", 0, 12)], "plus", -100, now)).toEqual([]);
  });
  it("is free with no blocks", () => {
    expect(tierAt([], now)).toBe("free");
    expect(layout({ plus: 0, pro: 0 }, now)).toEqual([]);
  });
});

describe("planEnding", () => {
  it("flags the last paid day when it is within a week", () => {
    expect(planEnding([block("plus", 0, 12)], now)).toBeNull();
    expect(planEnding([block("plus", 0, 5)], now)).toMatchObject({ tier: "plus", days: 4 });
    expect(planEnding([block("pro", 0, 3), block("plus", 3, 5)], now)).toMatchObject({ tier: "plus" });
    expect(planEnding([block("plus", -3, 0.5)], now)).toMatchObject({ days: 0 });
    expect(planEnding([], now)).toBeNull();
  });
});
