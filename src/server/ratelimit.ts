// Postgres is authoritative: rolling windows and all additional buckets survive Redis outages.
import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { db } from "@/db";
import { consumeWindow } from "./delivery";
import { deliveryContext, type DeliveryContext } from "./delivery-context";
import { digest } from "./delivery-identity";
import { DeliveryBlocked } from "./delivery-policy";
export const LIMITS = { requests: { max: 100, window: "10 s" }, answersPerQuestionPerMinute: 10 } as const;
export const SLOW_DOWN = "Too many requests. Please wait a moment and try again.";
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;

export async function limitPractice(userId: string, kind: "request" | "answer", questionId?: string) {
  return databaseLimit(userId, kind, questionId, await deliveryContext());
}
export async function databaseLimit(userId:string, kind:"request"|"answer"="request", questionId?:string, context:DeliveryContext={ip:null,device:null}):Promise<string|null> {
  try {
    await db.transaction(async tx => {
      // Always acquire shared buckets in the same order.
      const buckets = [{id:`request:user:${userId}`,max:LIMITS.requests.max},
        ...(context.device ? [{id:`request:device:${context.device}`,max:LIMITS.requests.max * 2}] : []),
        ...(context.ip ? [{id:`request:ip:${context.ip}`,max:1000}] : [])].sort((a,b)=>a.id.localeCompare(b.id));
      for (const b of buckets) await consumeWindow(tx,b.id,b.max,10_000);
    });
    // A rejected answer must still count as a request.
    if(kind==="answer" && questionId) await db.transaction(tx=>consumeWindow(tx,`answer:${userId}:${questionId}`,LIMITS.answersPerQuestionPerMinute,60_000));
    return null;
  } catch(e) {
    if (e instanceof DeliveryBlocked) return SLOW_DOWN;
    // The throttle's own bookkeeping failed (database hiccup), which says nothing about this student. Blocking here
    // would turn every blip into "Practice is unavailable" for everyone. The real work still needs the database.
    console.warn("Practice throttle unavailable; allowing request", e instanceof Error ? e.message : e);
    return null;
  }
}

const anonymous = redis && new Ratelimit({ redis, prefix: "openprep:anon", limiter: Ratelimit.slidingWindow(300, "1 m") });
/** Signed-out POSTs (sign-in, reports): 300 per minute per IP. True when this request should get a 429. */
export async function anonymousLimited(ip: string) {
  if (anonymous) { try { if (!(await anonymous.limit(ip)).success) return true; } catch { /* Database remains authoritative. */ } }
  try { await db.transaction(tx=>consumeWindow(tx,`anonymous:${digest(ip)}`,300,60_000)); return false; }
  // Only an exceeded limit is a 429. A database error must not lock signed-out visitors out of signing in.
  catch (e) { return e instanceof DeliveryBlocked; }
}

