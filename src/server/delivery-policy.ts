// Protect against rapid automated requests, without daily/weekly study quotas.
export const DELIVERY_POLICY = {
  minute: 300,
  pendingMs: 24 * 3_600_000,
  paperHours: 24,
  setsPerMinute: 30,
  similarPerMinute: 60,
} as const;

export class DeliveryBlocked extends Error {
  constructor(message = "Too many rapid requests. Please wait a minute and try again.") { super(message); }
}
