// Per-user rate limits on the practice API, in Upstash Redis (sliding windows). Switched on by
// UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN. The questions-per-hour cap is also enforced in the database
// (overServeLimit in practice.ts), so it holds even without Redis or if Redis is unreachable.
import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const LIMITS = { requests: { max: 5, window: "10 s" }, questionsPerHour: 20, answersPerQuestionPerMinute: 3 } as const;
// Deliberately vague: the messages never tell a scraper how big a limit is or how much of it is left.
export const SLOW_DOWN = "Too many requests. Please wait a moment and try again.";
export const HOUR_CAP = "You've done a lot of questions recently. Take a short break and come back soon.";

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;
const requests = redis && new Ratelimit({ redis, prefix: "openprep:practice:req", limiter: Ratelimit.slidingWindow(LIMITS.requests.max, LIMITS.requests.window) });
const questions = redis && new Ratelimit({ redis, prefix: "openprep:practice:q", limiter: Ratelimit.slidingWindow(LIMITS.questionsPerHour, "1 h") });
const answers = redis && new Ratelimit({ redis, prefix: "openprep:practice:a", limiter: Ratelimit.slidingWindow(LIMITS.answersPerQuestionPerMinute, "1 m") });

/**
 * Call at the top of every practice server action. "question" also counts toward the questions-per-hour cap.
 * Returns the message to show the student, or null when the call may go ahead.
 */
export async function limitPractice(userId: string, kind: "request" | "question" | "answer", questionId?: string): Promise<string | null> {
  if (!requests || !questions || !answers) return null; // Redis not configured: the database caps still apply
  try {
    if (!(await requests.limit(userId)).success) return SLOW_DOWN;
    if (kind === "question" && !(await questions.limit(userId)).success) return HOUR_CAP;
    if (kind === "answer" && questionId && !(await answers.limit(`${userId}:${questionId}`)).success) return SLOW_DOWN;
  } catch {
    // Redis unreachable: don't take practice down; the database caps still apply.
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
