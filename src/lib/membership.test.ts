import { describe, expect, it } from "vitest";
import { daysToTest, layout, quote, remainingMs, tierAt, withDays, type Block } from "@/lib/membership";

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
  it("needs a future test date for 'until my SAT'", () => {
    expect(quote("plus", "until_test", null, now)).toBeNull();
    expect(quote("plus", "until_test", "2026-02-28", now)).toBeNull();
  });
  it("counts today through test day, and rounds to 50 cents", () => {
    expect(daysToTest("2026-03-01", now)).toBe(1);
    expect(daysToTest("2026-03-10", now)).toBe(10);
    expect(quote("plus", "until_test", "2026-03-10", now)).toEqual({ days: 10, cents: 250 }); // 10 × 7/30 = 2.33
    expect(quote("plus", "until_test", "2026-03-01", now)).toEqual({ days: 1, cents: 200 }); // floor
  });
  it("uses the cheaper quarterly rate from 90 days and caps at a year", () => {
    expect(quote("plus", "until_test", "2026-05-29", now)).toEqual({ days: 90, cents: 1500 });
    expect(quote("pro", "until_test", "2030-01-01", now)).toEqual({ days: 365, cents: 13000 }); // 365 × 32/90 = 129.78, nearest 50 cents
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
