// Postgres is authoritative: rolling windows and all additional buckets survive Redis outages.
import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { db } from "@/db";
import { consumeWindow } from "./delivery";
import { deliveryContext, type DeliveryContext } from "./delivery-context";
import { digest } from "./delivery-identity";
import { DeliveryBlocked } from "./delivery-policy";
export const LIMITS = { requests: { max: 10, window: "10 s" }, answersPerQuestionPerMinute: 3 } as const;
export const SLOW_DOWN = "Too many requests. Please wait a moment and try again.";
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;

export async function limitPractice(userId: string, kind: "request" | "answer", questionId?: string) {
  return databaseLimit(userId, kind, questionId, await deliveryContext());
}
export async function databaseLimit(userId:string, kind:"request"|"answer"="request", questionId?:string, context:DeliveryContext={ip:null,device:null}):Promise<string|null> {
  try {
    await db.transaction(async tx => {
      // Always acquire shared buckets in the same order.
      const buckets = [{id:`request:user:${userId}`,max:10},
        ...(context.device ? [{id:`request:device:${context.device}`,max:20}] : []),
        ...(context.ip ? [{id:`request:ip:${context.ip}`,max:100}] : [])].sort((a,b)=>a.id.localeCompare(b.id));
      for (const b of buckets) await consumeWindow(tx,b.id,b.max,10_000);
    });
    // A rejected answer must still count as a request.
    if(kind==="answer" && questionId) await db.transaction(tx=>consumeWindow(tx,`answer:${userId}:${questionId}`,3,60_000));
    return null;
  } catch(e) { return e instanceof DeliveryBlocked ? SLOW_DOWN : 'Practice is temporarily unavailable. Please try again shortly.'; }
}

const anonymous = redis && new Ratelimit({ redis, prefix: "openprep:anon", limiter: Ratelimit.slidingWindow(30, "1 m") });
/** Signed-out POSTs (sign-in, reports): 30 per minute per IP. True when this request should get a 429. */
export async function anonymousLimited(ip: string) {
  if (anonymous) { try { if (!(await anonymous.limit(ip)).success) return true; } catch { /* Database remains authoritative. */ } }
  try { await db.transaction(tx=>consumeWindow(tx,`anonymous:${digest(ip)}`,30,60_000)); return false; }
  catch { return true; }
}

export const redisConfigured = () => !!redis;
