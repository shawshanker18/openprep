// Per-user rate limits on the practice API, in Upstash Redis (sliding windows). Switched on by
// UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN. These limit how fast the API is called, never how many
// questions a student does. A speed limit on new questions also lives in the database (tooFast in practice.ts).
import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const LIMITS = { requests: { max: 10, window: "10 s" }, answersPerQuestionPerMinute: 3 } as const;
// Deliberately vague: the messages never tell a scraper how big a limit is or how much of it is left.
export const SLOW_DOWN = "Too many requests. Please wait a moment and try again.";

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;
const requests = redis && new Ratelimit({ redis, prefix: "openprep:practice:req", limiter: Ratelimit.slidingWindow(LIMITS.requests.max, LIMITS.requests.window) });
const answers = redis && new Ratelimit({ redis, prefix: "openprep:practice:a", limiter: Ratelimit.slidingWindow(LIMITS.answersPerQuestionPerMinute, "1 m") });

/**
 * Call at the top of every practice server action. "answer" also stops trying many answers on one question.
 * Returns the message to show the student, or null when the call may go ahead.
 */
export async function limitPractice(userId: string, kind: "request" | "answer", questionId?: string): Promise<string | null> {
  if (!requests || !answers) return null; // Redis not configured: the database speed limit still applies
  try {
    if (!(await requests.limit(userId)).success) return SLOW_DOWN;
    if (kind === "answer" && questionId && !(await answers.limit(`${userId}:${questionId}`)).success) return SLOW_DOWN;
  } catch {
    // Redis unreachable: don't take practice down; the database speed limit still applies.
  }
  return null;
}

const anonymous = redis && new Ratelimit({ redis, prefix: "openprep:anon", limiter: Ratelimit.slidingWindow(30, "1 m") });
/** Signed-out POSTs (sign-in, reports): 30 per minute per IP. True when this request should get a 429. */
export async function anonymousLimited(ip: string) {
  if (!anonymous) return false;
  try { return !(await anonymous.limit(ip)).success; } catch { return false; }
}

export const redisConfigured = () => !!redis;
