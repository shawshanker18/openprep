import type { PaidTier } from "./tiers";

// One-time memberships. Each payment buys days of one tier; the higher tier always runs first, then the lower one.
export const BILLING = ["monthly", "quarterly", "until_test"] as const;
export type Billing = (typeof BILLING)[number];
export const isBilling = (v: unknown): v is Billing => (BILLING as readonly unknown[]).includes(v);

export const PERIOD_DAYS = { monthly: 30, quarterly: 90 } as const;
/** Quarterly works out to $5 a month for Plus (7 → 5); Pro keeps the same ratio and rounds to a whole dollar. */
export const PRICE_CENTS: Record<"monthly" | "quarterly", Record<PaidTier, number>> = {
  monthly: { plus: 700, pro: 1500 },
  quarterly: { plus: 1500, pro: 3200 },
};
export const MAX_DAYS = 365;
/** PayPal keeps about 49 cents per payment, so nothing is sold for less than this. */
export const MIN_CENTS = 200;
const DAY = 86_400_000;

/** Days from today through the test day (inclusive), capped at a year. Null when there is no future test date. */
export function daysToTest(testDate: string | null | undefined, now: Date): number | null {
  if (!testDate) return null;
  const [y, m, d] = testDate.split("-").map(Number);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const n = Math.round((Date.UTC(y!, m! - 1, d!) - today) / DAY) + 1;
  return n >= 1 ? Math.min(n, MAX_DAYS) : null;
}

/** The server prices every payment from the student's account. The browser only says which option it wants. */
export function quote(tier: PaidTier, billing: Billing, testDate: string | null | undefined, now = new Date()): { days: number; cents: number } | null {
  if (billing !== "until_test") return { days: PERIOD_DAYS[billing], cents: PRICE_CENTS[billing][tier] };
  const days = daysToTest(testDate, now);
  if (!days) return null;
  const perDay = days >= PERIOD_DAYS.quarterly ? PRICE_CENTS.quarterly[tier] / PERIOD_DAYS.quarterly : PRICE_CENTS.monthly[tier] / PERIOD_DAYS.monthly;
  return { days, cents: Math.max(MIN_CENTS, Math.round((days * perDay) / 50) * 50) };
}

export type Block = { tier: PaidTier; startsAt: Date; endsAt: Date };

export function remainingMs(blocks: Block[], now: Date): Record<PaidTier, number> {
  const out: Record<PaidTier, number> = { plus: 0, pro: 0 };
  for (const b of blocks) out[b.tier] += Math.max(0, b.endsAt.getTime() - Math.max(b.startsAt.getTime(), now.getTime()));
  return out;
}

/** Lays the remaining time out from now: Pro first, then Plus. */
export function layout(remaining: Record<PaidTier, number>, now: Date): Block[] {
  const out: Block[] = [];
  let at = now.getTime();
  for (const tier of ["pro", "plus"] as const) {
    if (remaining[tier] <= 0) continue;
    out.push({ tier, startsAt: new Date(at), endsAt: new Date(at + remaining[tier]) });
    at += remaining[tier];
  }
  return out;
}

/** Adds (or, with negative days, takes back) days of one tier, keeping every other paid day. */
export function withDays(blocks: Block[], tier: PaidTier, days: number, now: Date): Block[] {
  const r = remainingMs(blocks, now);
  r[tier] = Math.max(0, r[tier] + days * DAY);
  return layout(r, now);
}

export function tierAt(blocks: Block[], now: Date): "free" | PaidTier {
  const live = blocks.filter((b) => b.startsAt <= now && now < b.endsAt);
  return live.some((b) => b.tier === "pro") ? "pro" : live.length ? "plus" : "free";
}
