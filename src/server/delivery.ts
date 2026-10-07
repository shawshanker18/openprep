import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { attempts, deliveryGuards, deliveryWindows, questionExposures, questionServes, questions, type Question } from "@/db/schema";
import type { DeliveryContext } from "./delivery-context";
import { DELIVERY_POLICY as P, DeliveryBlocked } from "./delivery-policy";

/** Fixed lock order makes checks and writes atomic across account, device and network, without Redis. */
export async function lockDelivery(tx: Tx, userId: string, context: DeliveryContext) {
  const scopes = [`user:${userId}`, ...(context.ip ? [`ip:${context.ip}`] : []), ...(context.device ? [`device:${context.device}`] : [])].sort();
  for (const id of scopes) {
    const expiresAt = new Date(Date.now() + 7 * 86_400_000);
    // An upsert acquires the row lock and updates its expiry in one round trip.
    await tx.insert(deliveryGuards).values({ id, expiresAt })
      .onConflictDoUpdate({ target: deliveryGuards.id, set: { expiresAt } });
  }
}

/** Must run inside a transaction. Throwing rolls back every consumed bucket. */
export async function consumeWindow(tx: Tx, id: string, max: number, ms: number, amount = 1, now = Date.now()) {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > max) throw new DeliveryBlocked();
  const additions = JSON.stringify(Array<number>(amount).fill(now));
  const recent = sql`coalesce((select jsonb_agg(t.value)
    from jsonb_array_elements(${deliveryWindows.times}) as t(value)
    where (t.value::text)::bigint > ${now - ms}), '[]'::jsonb)`;
  // ON CONFLICT serializes competing increments; the WHERE guard refuses overflow atomically.
  const accepted = await tx.insert(deliveryWindows)
    .values({ id, times: JSON.parse(additions) as number[], expiresAt: new Date(now + ms) })
    .onConflictDoUpdate({
      target: deliveryWindows.id,
      set: { times: sql`${recent} || ${additions}::jsonb`, expiresAt: new Date(now + ms) },
      setWhere: sql`jsonb_array_length(${recent}) + ${amount} <= ${max}`,
    }).returning({ id: deliveryWindows.id });
  if (!accepted.length) throw new DeliveryBlocked();
}

export async function eventQuota(userId: string, context: DeliveryContext, kind: "set" | "similar" | "asset") {
  return db.transaction(async tx => {
    await lockDelivery(tx, userId, context);
    const ms = 60_000;
    const max = kind === "asset" ? 240 : kind === "set" ? P.setsPerMinute : P.similarPerMinute;
    await consumeWindow(tx, `${kind}:user:${userId}`, max, ms);
    if (context.device) await consumeWindow(tx, `${kind}:device:${context.device}`, max * 2, ms);
    if (context.ip) await consumeWindow(tx, `${kind}:ip:${context.ip}`, max * 50, ms);
  });
}

/** All fresh content, including test modules and diagnostics, passes through this same ledger. */
export async function exposeQuestions(tx: Tx, userId: string, qs: Pick<Question, "id" | "skillId">[], context: DeliveryContext) {
  if (!qs.length) return;
  await lockDelivery(tx, userId, context);
  const unique = [...new Map(qs.map(q => [q.id, q])).values()];
  const existing = await tx.select({ id: questionExposures.questionId }).from(questionExposures)
    .where(and(eq(questionExposures.userId, userId), inArray(questionExposures.questionId, unique.map(q => q.id))));
  const seen = new Set(existing.map(q => q.id));
  const fresh = unique.filter(q => !seen.has(q.id));
  if (!fresh.length) return;
  const active=await tx.select({id:questions.id}).from(questions).where(and(inArray(questions.id,fresh.map(q=>q.id)),eq(questions.status,"active")));
  if(active.length!==fresh.length) throw new DeliveryBlocked("These questions have been updated. Start a new practice set or test.");
  const now = new Date();
  await tx.insert(questionExposures).values(fresh.map(q => ({ userId, questionId: q.id, skillId: q.skillId, ipHash: context.ip, deviceHash: context.device, firstAt: now })));
}

export async function servePractice(userId: string, q: Question, context: DeliveryContext, paper?: { nonce: string; count: number }, transaction?: Tx) {
  const run = async (tx: Tx) => {
    await lockDelivery(tx, userId, context);
    const now = new Date();
    // Re-serving an unanswered question must not reset its clock.
    const [old] = await tx.select().from(questionServes).where(and(eq(questionServes.userId, userId), eq(questionServes.questionId, q.id)));
    if (old && old.servedAt > new Date(now.getTime() - P.pendingMs)) {
      const [result] = await tx.select({id:attempts.id}).from(attempts).where(and(eq(attempts.userId,userId),eq(attempts.questionId,q.id),gte(attempts.createdAt,old.servedAt))).limit(1);
      if (!result) return; // Reuse the existing delivery instead of blocking another saved session.
    }
    await consumeWindow(tx, `delivery:user:${userId}`, P.minute, 60_000);
    if (paper) await consumeWindow(tx, `paper:${userId}:${paper.nonce}`, paper.count, P.paperHours * 3_600_000);
    await exposeQuestions(tx, userId, [q], context);
    await tx.insert(questionServes).values({ userId, questionId: q.id, servedAt: now })
      .onConflictDoUpdate({ target: [questionServes.userId, questionServes.questionId], set: { servedAt: now } });
  };
  return transaction ? run(transaction) : db.transaction(run);
}
