import { isSatDate } from "./sat-dates";
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
/** PayPal keeps about 49 cents per payment, so nothing is sold for less than this. */
export const MIN_CENTS = 200;
/** Buying up to an exam costs this share of buying the same months outright. */
export const EXAM_RATE = 0.9;
const DAY = 86_400_000;

/** "until_test:2026-11-07" is one of the official SAT dates; the other two options carry no date. */
export function parseChoice(value: string): { billing: Billing; exam: string | null } | null {
  const [billing, exam, ...rest] = value.split(":");
  if (!isBilling(billing) || rest.length) return null;
  if (billing === "until_test") return exam && isSatDate(exam) ? { billing, exam } : null;
  return exam === undefined ? { billing, exam: null } : null;
}

/** Days from today through the day after the exam (the plan ends the day after the SAT). Null once that exam has passed. */
export function daysThroughExam(exam: string | null | undefined, now: Date): number | null {
  if (!exam) return null;
  const [y, m, d] = exam.split("-").map(Number);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diff = Math.round((Date.UTC(y!, m! - 1, d!) - today) / DAY);
  return diff >= 0 ? diff + 2 : null;
}

/** The cheapest way to buy at least `days` from the fixed 30-day and 3-month options. */
export function outrightCents(tier: PaidTier, days: number) {
  const q = PERIOD_DAYS.quarterly, m = PERIOD_DAYS.monthly, full = Math.floor(days / q);
  const mixed = full * PRICE_CENTS.quarterly[tier] + Math.ceil((days - full * q) / m) * PRICE_CENTS.monthly[tier];
  return Math.min(mixed, Math.ceil(days / q) * PRICE_CENTS.quarterly[tier]);
}

/** The server prices every payment. The browser only says which option it wants. */
export function quote(tier: PaidTier, billing: Billing, exam: string | null | undefined, now = new Date()): { days: number; cents: number } | null {
  if (billing !== "until_test") return { days: PERIOD_DAYS[billing], cents: PRICE_CENTS[billing][tier] };
  const days = daysThroughExam(exam, now);
  if (!days) return null;
  return { days, cents: Math.max(MIN_CENTS, Math.round((outrightCents(tier, days) * EXAM_RATE) / 50) * 50) };
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

/** When the last paid day is within `within` days: the tier running at the end and whole days left (0 = ends today). */
export function planEnding(blocks: Block[], now: Date, within = 7): { tier: PaidTier; days: number; endsAt: Date } | null {
  const live = blocks.filter((b) => b.endsAt > now);
  if (!live.length) return null;
  const last = live.reduce((a, b) => (b.endsAt > a.endsAt ? b : a));
  const days = Math.ceil((last.endsAt.getTime() - now.getTime()) / DAY) - 1;
  return days <= within ? { tier: last.tier, days: Math.max(0, days), endsAt: last.endsAt } : null;
}
