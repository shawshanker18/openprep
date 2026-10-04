// Per-user rate limits on the practice API, in Upstash Redis (sliding windows). Switched on by
// UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN. These limit how fast the API is called, never how many
// questions a student does. A speed limit on new questions also lives in the database (tooFast in practice.ts).
import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { sql } from "drizzle-orm";
import { db } from "@/db";

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
  if (!requests || !answers) return databaseLimit(userId);
  try {
    if (!(await requests.limit(userId)).success) return SLOW_DOWN;
    if (kind === "answer" && questionId && !(await answers.limit(`${userId}:${questionId}`)).success) return SLOW_DOWN;
  } catch {
    return databaseLimit(userId);
  }
  return null;
}

/** Bounded storage and atomic updates: no paid service required for the basic request limit. */
export async function databaseLimit(userId:string):Promise<string|null> {
  const windowStart=new Date(Math.floor(Date.now()/10_000)*10_000).toISOString();
  try {
    const rows=await db.execute(sql`
      insert into public.practice_rate_windows(user_id,window_start,requests) values(${userId}::uuid,${windowStart},1)
      on conflict(user_id) do update set window_start=excluded.window_start,
        requests=case when practice_rate_windows.window_start=excluded.window_start then practice_rate_windows.requests+1 else 1 end
      where practice_rate_windows.window_start<>excluded.window_start or practice_rate_windows.requests<10
      returning requests`);
    const records=Array.isArray(rows)?rows:(rows as unknown as {rows:unknown[]}).rows;
    return records.length?null:SLOW_DOWN;
  } catch { return 'Practice is temporarily unavailable. Please try again shortly.'; }
}

const anonymous = redis && new Ratelimit({ redis, prefix: "openprep:anon", limiter: Ratelimit.slidingWindow(30, "1 m") });
/** Signed-out POSTs (sign-in, reports): 30 per minute per IP. True when this request should get a 429. */
export async function anonymousLimited(ip: string) {
  if (!anonymous) return false;
  try { return !(await anonymous.limit(ip)).success; } catch { return false; }
}

export const redisConfigured = () => !!redis;
