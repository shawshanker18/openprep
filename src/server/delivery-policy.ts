// Server-only policy. Rolling allowances for unanswered exposures, replenished by distinct,
// server-recorded answers. Shared-network allowances are deliberately higher.
export const DELIVERY_POLICY = {
  account: { day: 180, week: 600 },
  skill: { day: 60, week: 180 },
  device: { day: 360, week: 1200 },
  ip: { day: 1800, week: 6000 },
  minute: 12, pendingMs: 30 * 60_000, minimumAnswerMs: 5000,
  paperHours: 2, setsPerDay: 60, similarPerDay: 30,
} as const;

export class DeliveryBlocked extends Error {
  constructor(message = "Question access is temporarily limited. Please try again later.") { super(message); }
}
