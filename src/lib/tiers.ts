// Paid tiers: what each plan includes. Pure, so pages, actions and tests share one source of truth.
export const TIERS = ["free", "plus", "pro"] as const;
export type Tier = (typeof TIERS)[number];
export type PaidTier = Exclude<Tier, "free">;

export const PLANS: Record<PaidTier, { name: string; priceUsd: number }> = {
  plus: { name: "Plus", priceUsd: 7 },
  pro: { name: "Pro", priceUsd: 15 },
};

/** Practice tests a plan can open (papers 1..n). Only the first four exist so far; the cap bites once more are added. */
export const PAPER_LIMIT: Record<Tier, number> = { free: 6, plus: 20, pro: 20 };

export const REMIX = {
  /** Fresh AI generations per calendar month (UTC). Opening a remix someone already made is free. */
  monthlyCredits: { free: 0, plus: 50, pro: Infinity },
  /** Abuse caps that apply even to unlimited Pro: fresh generations per rolling hour and per rolling day. */
  proPerHour: 15,
  proPerDay: 60,
  /** Every remix request, cached or not: per user per minute. */
  requestsPerMinute: 10,
  /** Circuit breaker on total fresh generations per rolling day across all users (API cost ceiling). */
  globalPerDay: Number(process.env.REMIX_GLOBAL_DAILY_CAP) || 3000,
} as const;

export const canRemix = (tier: Tier) => tier !== "free";
export const canOpenPaper = (tier: Tier, paper: number) => paper <= PAPER_LIMIT[tier];
export const isPaidTier = (v: unknown): v is PaidTier => v === "plus" || v === "pro";
