import "server-only";
import { and, count, eq, gte, inArray } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { attempts, deliveryGuards, deliveryWindows, questionExposures, questionServes, questions, type Question } from "@/db/schema";
import type { DeliveryContext } from "./delivery-context";
import { DELIVERY_POLICY as P, DeliveryBlocked } from "./delivery-policy";

/** Fixed lock order makes checks and writes atomic across account, device and network, without Redis. */
export async function lockDelivery(tx: Tx, userId: string, context: DeliveryContext) {
  const scopes = [`user:${userId}`, ...(context.ip ? [`ip:${context.ip}`] : []), ...(context.device ? [`device:${context.device}`] : [])].sort();
  for (const id of scopes) {
    await tx.insert(deliveryGuards).values({ id }).onConflictDoNothing();
    await tx.select().from(deliveryGuards).where(eq(deliveryGuards.id, id)).for("update");
    await tx.update(deliveryGuards).set({expiresAt:new Date(Date.now()+7*86_400_000)}).where(eq(deliveryGuards.id,id));
  }
}

/** Must run inside a transaction. Throwing rolls back every consumed bucket. */
export async function consumeWindow(tx: Tx, id: string, max: number, ms: number, amount = 1, now = Date.now()) {
  await tx.insert(deliveryWindows).values({ id, times: [], expiresAt: new Date(now + ms) }).onConflictDoNothing();
  const [row] = await tx.select().from(deliveryWindows).where(eq(deliveryWindows.id, id)).for("update");
  const times = row!.times.filter(t => t > now - ms);
  if (times.length + amount > max) throw new DeliveryBlocked();
  await tx.update(deliveryWindows).set({ times: [...times, ...Array<number>(amount).fill(now)], expiresAt: new Date(now + ms) }).where(eq(deliveryWindows.id, id));
}

export async function eventQuota(userId: string, context: DeliveryContext, kind: "set" | "similar" | "asset") {
  return db.transaction(async tx => {
    await lockDelivery(tx, userId, context);
    const ms = kind === "asset" ? 60_000 : 86_400_000;
    const max = kind === "asset" ? 120 : kind === "set" ? P.setsPerDay : P.similarPerDay;
    await consumeWindow(tx, `${kind}:user:${userId}`, max, ms);
    if (context.device) await consumeWindow(tx, `${kind}:device:${context.device}`, max * 2, ms);
    if (context.ip) await consumeWindow(tx, `${kind}:ip:${context.ip}`, max * 10, ms);
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
  const scopes = [ { predicate: eq(questionExposures.userId, userId), limits: P.account },
    ...(context.ip ? [{ predicate: eq(questionExposures.ipHash, context.ip), limits: P.ip }] : []),
    ...(context.device ? [{ predicate: eq(questionExposures.deviceHash, context.device), limits: P.device }] : []),
  ];
  for (const { predicate, limits } of scopes) {
    for (const [days, max] of [[1, limits.day], [7, limits.week]]) {
      const [r] = await tx.select({ n: count() }).from(questionExposures).where(and(predicate, gte(questionExposures.firstAt, new Date(now.getTime() - days! * 86_400_000))));
      if (r!.n + fresh.length > max!) throw new DeliveryBlocked();
    }
  }
  for (const skill of new Set(fresh.map(q => q.skillId))) {
    const amount = fresh.filter(q => q.skillId === skill).length;
    for (const [days, max] of [[1, P.skill.day], [7, P.skill.week]]) {
      const [r] = await tx.select({ n: count() }).from(questionExposures).where(and(eq(questionExposures.userId, userId), eq(questionExposures.skillId, skill), gte(questionExposures.firstAt, new Date(now.getTime() - days! * 86_400_000))));
      if (r!.n + amount > max!) throw new DeliveryBlocked();
    }
  }
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
