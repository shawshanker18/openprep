"use server";

import { and, count, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { text } from "@/lib/text";
import { db } from "@/db";
import { attempts, bookmarks, questionReports, questions } from "@/db/schema";
import { MISTAKE_TYPES } from "@/engine/mistakes";
import { diagnosticPending, requireUser } from "@/server/auth";
import { nextQuestion as next, submitAnswer as submit, tooFast, wasGiven } from "@/server/practice";
import { limitPractice, SLOW_DOWN } from "@/server/ratelimit";
import { internalId, internalIds } from "@/server/questions";

const id = text().min(1).max(64);

const Next = z.object({
  mode: z.enum(["skill", "smart", "review", "set", "list"]),
  skillId: id.optional(),
  exclude: z.array(id).max(200),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal("mixed")]).optional(),
  skillIds: z.array(id).max(29).optional(),
  tags: z.array(id).max(50).optional(),
  timing: z.enum(["auto", "off", "on"]).optional(),
  ids: z.array(id).max(50).optional(),
});
export async function nextQuestion(input: z.input<typeof Next>) {
  const { userId, profile } = await requireUser();
  if (diagnosticPending(profile)) return { ok: false as const, error: "Take the diagnostic first." };
  const p = Next.safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid request." };
  const limited = await limitPractice(userId, "request");
  if (limited) return { ok: false as const, error: limited };
  if (await tooFast(userId)) return { ok: false as const, error: SLOW_DOWN };
  const [exclude, ids] = await Promise.all([internalIds(p.data.exclude), p.data.ids ? internalIds(p.data.ids) : undefined]);
  const r = await next(userId, profile, { ...p.data, exclude, ids });
  return { ok: true as const, data: r ?? { done: true as const } };
}

const Submit = z.object({
  questionId: id,
  response: text().max(8).nullable(),
  timeMs: z.number().int().min(0).max(24 * 3_600_000),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export async function submitAnswer(input: z.input<typeof Submit>) {
  const { userId, profile } = await requireUser();
  if (diagnosticPending(profile)) return { ok: false as const, error: "Take the diagnostic first." };
  const p = Submit.safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid answer." };
  const questionId = await internalId(p.data.questionId);
  const limited = await limitPractice(userId, "answer", questionId ?? p.data.questionId);
  if (limited) return { ok: false as const, error: limited };
  const r = questionId ? await submit(userId, { ...p.data, questionId, timeMs: Math.max(1000, p.data.timeMs) }) : null;
  return r ? { ok: true as const, data: r } : { ok: false as const, error: "Question not found." };
}

export async function setMistakeType(input: { attemptId: string; type: string }) {
  const { userId } = await requireUser();
  const p = z.object({ attemptId: z.uuid(), type: z.enum(MISTAKE_TYPES) }).safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid mistake type." };
  const limited = await limitPractice(userId, "request");
  if (limited) return { ok: false as const, error: limited };
  await db.update(attempts).set({ mistakeType: p.data.type })
    .where(and(eq(attempts.id, p.data.attemptId), eq(attempts.userId, userId), eq(attempts.correct, false)));
  return { ok: true as const, data: undefined };
}

export async function toggleBookmark(input: { questionId: string }) {
  const { userId } = await requireUser();
  const p = z.object({ questionId: id }).safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid question." };
  const limited = await limitPractice(userId, "request");
  if (limited) return { ok: false as const, error: limited };
  const questionId = await internalId(p.data.questionId);
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
  const questionId = await internalId(p.data.questionId);
  const [q] = questionId ? await db.select({ id: questions.id }).from(questions).where(eq(questions.id, questionId)) : [];
  if (!q) return { ok: false as const, error: "Question not found." };
  await db.insert(questionReports).values({ userId, ...p.data, questionId: q.id });
  return { ok: true as const, data: undefined };
}
