import "server-only";
import { and, eq, gte, inArray, sql, type SQL } from "drizzle-orm";
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

/** Count each first exposure once, even if its question is answered/reviewed repeatedly.
 * Completion is read from server-owned attempts, not a client counter. The server caps
 * recorded answer time; blank/instant answers cannot replenish the collection allowance.
 */
async function exposureUsage(tx: Tx, predicate: SQL, now: Date) {
  const day = new Date(now.getTime() - 86_400_000);
  const completed = sql`exists (
    select 1 from ${attempts}
    where ${attempts.userId} = ${questionExposures.userId}
      and ${attempts.questionId} = ${questionExposures.questionId}
      and ${attempts.createdAt} >= ${questionExposures.firstAt} + ${P.minimumAnswerMs} * interval '1 millisecond'
      and ${attempts.timeMs} >= ${P.minimumAnswerMs}
      and length(trim(${attempts.response})) > 0
  )`;
  const [usage] = await tx.select({
    day: sql<number>`count(*) filter (where ${questionExposures.firstAt} >= ${day})::int`,
    week: sql<number>`count(*)::int`,
    answeredDay: sql<number>`count(*) filter (where ${questionExposures.firstAt} >= ${day} and ${completed})::int`,
    answeredWeek: sql<number>`count(*) filter (where ${completed})::int`,
  }).from(questionExposures).where(and(predicate, gte(questionExposures.firstAt, new Date(now.getTime() - 7 * 86_400_000))));
  return usage!;
}

async function checkExposureAllowance(tx: Tx, predicate: SQL, limits: {day: number; week: number}, amount: number, now: Date) {
  const usage = await exposureUsage(tx, predicate, now);
  if (usage.day + amount > limits.day + usage.answeredDay || usage.week + amount > limits.week + usage.answeredWeek)
    throw new DeliveryBlocked("New questions are temporarily limited. Answer some of your saved questions, or try again later.");
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
    await checkExposureAllowance(tx, predicate, limits, fresh.length, now);
  }
  for (const skill of new Set(fresh.map(q => q.skillId))) {
    const amount = fresh.filter(q => q.skillId === skill).length;
    await checkExposureAllowance(tx, and(eq(questionExposures.userId, userId), eq(questionExposures.skillId, skill))!, P.skill, amount, now);
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
