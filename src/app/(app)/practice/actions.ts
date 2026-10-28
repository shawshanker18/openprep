"use server";

import { and, count, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { text } from "@/lib/text";
import { db } from "@/db";
import { attempts, bookmarks, questionReports, questions } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { nextQuestion as next, resumeQuestion, submitAnswer as submit, wasGiven } from "@/server/practice";
import { limitPractice } from "@/server/ratelimit";
import { internalId, internalIds } from "@/server/questions";
import { deliveryContext } from "@/server/delivery-context";
import { eventQuota } from "@/server/delivery";
import { DeliveryBlocked } from "@/server/delivery-policy";
import { readPaper } from "@/server/papers";
import { DIRECTIONS, DIRECTION_LABEL } from "@/lib/remix";
import { getTier } from "@/server/subscription";
import { getOrCreateRemix, limitRemixRequests, remixOrigin, RemixError } from "@/server/remix";
import { servePractice } from "@/server/delivery";
import { createPracticeSession } from "@/server/practice-sessions";
import { publicId } from "@/server/questions";

const id = text().min(1).max(64);

const Next = z.object({ paperId: z.string().max(12000), exclude: z.array(id).max(200), similarTo: id.optional(), resumeId:id.optional() });
export async function nextQuestion(input: z.input<typeof Next>) {
  const { userId, profile } = await requireUser();
  const p = Next.safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid request." };
  const limited = await limitPractice(userId, "request");
  if (limited) return { ok: false as const, error: limited };
  const config = readPaper(userId, p.data.paperId);
  if (!config) return { ok: false as const, error: "This practice link has expired. Reload the page to continue." };
  if(p.data.resumeId) {
    const restoredId=await internalId(p.data.resumeId, userId);
    const restored=restoredId?await resumeQuestion(userId,restoredId,config.timing):null;
    if(restored) return {ok:true as const,data:restored};
  }
  const [exclude, ids] = await Promise.all([internalIds(p.data.exclude, userId), config.ids ? internalIds(config.ids, userId) : undefined]);
  const context = await deliveryContext();
  if (p.data.similarTo) {
    const previous = await internalId(p.data.similarTo, userId);
    if (!previous || !(await wasGiven(userId, previous))) return { ok: false as const, error: "Question not found." };
    const [answered]=await db.select({id:attempts.id}).from(attempts).where(and(eq(attempts.userId,userId),eq(attempts.questionId,previous))).limit(1);
    if(!answered) return {ok:false as const,error:"Answer your question first."};
    try { await eventQuota(userId,context,"similar"); } catch (e) { if(e instanceof DeliveryBlocked) return {ok:false as const,error:e.message}; throw e; }
    const [q] = await db.select({ skillId: questions.skillId }).from(questions).where(eq(questions.id, previous));
    if (q) { config.mode = "skill"; config.skillId = q.skillId; }
  }
  // A hand-picked ID may only revisit content already delivered to this account.
  if (config.ids && ids?.length !== config.ids.length) return {ok:false as const,error:"Question not found."};
  try {
    const r = await next(userId, profile, { ...config, exclude, ids, exploratory:!!p.data.similarTo, context, paper:{nonce:config.nonce,count:config.count} });
    return { ok: true as const, data: r ?? { done: true as const } };
  } catch(e) { if(e instanceof DeliveryBlocked) return {ok:false as const,error:e.message}; throw e; }
}

const Submit = z.object({
  questionId: id,
  response: text().max(8).nullable(),
  timeMs: z.number().int().min(0).max(24 * 3_600_000),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
});
export async function submitAnswer(input: z.input<typeof Submit>) {
  const { userId } = await requireUser();
  const p = Submit.safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid answer." };
  const questionId = await internalId(p.data.questionId, userId);
  const limited = await limitPractice(userId, "answer", questionId ?? p.data.questionId);
  if (limited) return { ok: false as const, error: limited };
  try {
    const r = questionId ? await submit(userId, { ...p.data, questionId, timeMs: Math.max(1000, p.data.timeMs) }) : null;
    return r ? { ok: true as const, data: r } : { ok: false as const, error: "Question not found." };
  } catch(e) { if(e instanceof DeliveryBlocked) return {ok:false as const,error:e.message}; throw e; }
}


export async function toggleBookmark(input: { questionId: string }) {
  const { userId } = await requireUser();
  const p = z.object({ questionId: id }).safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid question." };
  const limited = await limitPractice(userId, "request");
  if (limited) return { ok: false as const, error: limited };
  const questionId = await internalId(p.data.questionId, userId);
  if (!questionId || !(await wasGiven(userId, questionId))) return { ok: false as const, error: "Question not found." };
  const key = and(eq(bookmarks.userId, userId), eq(bookmarks.questionId, questionId));
  const removed = await db.delete(bookmarks).where(key).returning();
  if (!removed.length) await db.insert(bookmarks).values({ userId, questionId }).onConflictDoNothing();
  return { ok: true as const, data: { bookmarked: !removed.length } };
}

const Report = z.object({
  questionId: id, reason: z.enum(["wrong_answer", "unclear", "typo", "other"]), note: text().max(500).optional(),
});
export async function reportQuestion(input: z.input<typeof Report>) {
  const { userId } = await requireUser();
  const p = Report.safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid report." };
  const limited = await limitPractice(userId, "request");
  if (limited) return { ok: false as const, error: limited };
  const [{ c }] = (await db.select({ c: count() }).from(questionReports)
    .where(and(eq(questionReports.userId, userId), gte(questionReports.createdAt, new Date(Date.now() - 86_400_000))))) as [{ c: number }];
  if (c >= 20) return { ok: false as const, error: "You've sent a lot of reports today. Thank you! You can send more tomorrow." };
  const questionId = await internalId(p.data.questionId, userId);
  const [q] = questionId ? await db.select({ id: questions.id }).from(questions).where(eq(questions.id, questionId)) : [];
  if (!q || !(await wasGiven(userId,q.id))) return { ok: false as const, error: "Question not found." };
  await db.insert(questionReports).values({ userId, ...p.data, questionId: q.id });
  return { ok: true as const, data: undefined };
}

const Remix = z.object({ questionId: id, direction: z.enum(DIRECTIONS) });
/** Plus and Pro: an easier, same-level or harder AI version of a question already answered. Opens it as a new one-question practice session. */
export async function remixQuestion(input: z.input<typeof Remix>) {
  const { userId } = await requireUser();
  const p = Remix.safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid request." };
  try {
    const sourceId = await internalId(p.data.questionId, userId);
    if (!sourceId) return { ok: false as const, error: "Question not found." };
    const [answered] = await db.select({ id: attempts.id }).from(attempts).where(and(eq(attempts.userId, userId), eq(attempts.questionId, sourceId))).limit(1);
    if (!answered) return { ok: false as const, error: "Answer the question first, then remix it." };
    await limitRemixRequests(userId);
    const remixId = await getOrCreateRemix(userId, await getTier(userId), sourceId, p.data.direction);
    const [remix] = await db.select().from(questions).where(eq(questions.id, remixId));
    if (!remix) return { ok: false as const, error: "Couldn't open the remix." };
    await servePractice(userId, remix, await deliveryContext());
    const sessionId = await createPracticeSession(userId, { mode: "list", ids: [publicId(remixId, userId)], count: 1 }, `${DIRECTION_LABEL[p.data.direction]} remix`);
    return { ok: true as const, data: { url: `/practice?session=${sessionId}` } };
  } catch (e) {
    if (e instanceof RemixError || e instanceof DeliveryBlocked) return { ok: false as const, error: e.message };
    throw e;
  }
}

/** Label for a remix page: which question it was made from and in which direction. */
export async function remixOriginOf(input: { questionId: string }) {
  const { userId } = await requireUser();
  const questionId = await internalId(String(input.questionId), userId);
  const origin = questionId ? await remixOrigin(questionId) : null;
  return origin ? { direction: origin.direction, sourceRef: publicId(origin.sourceId, userId).slice(0, 4) } : null;
}
