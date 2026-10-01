"use server";

import { and, count, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attempts, bookmarks, questionReports, questions } from "@/db/schema";
import { MISTAKE_TYPES } from "@/engine/mistakes";
import { requireUser } from "@/server/auth";
import { nextQuestion as next, submitAnswer as submit } from "@/server/practice";

const id = z.string().min(1).max(64);

const Next = z.object({
  mode: z.enum(["skill", "smart", "review"]),
  skillId: id.optional(),
  exclude: z.array(id).max(200),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});
export async function nextQuestion(input: z.input<typeof Next>) {
  const { userId, profile } = await requireUser();
  const p = Next.safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid request." };
  const r = await next(userId, profile, p.data);
  return { ok: true as const, data: r ?? { done: true as const } };
}

const Submit = z.object({
  questionId: id,
  response: z.string().max(8).nullable(),
  timeMs: z.number().int().min(0).max(24 * 3_600_000),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export async function submitAnswer(input: z.input<typeof Submit>) {
  const { userId } = await requireUser();
  const p = Submit.safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid answer." };
  const r = await submit(userId, { ...p.data, timeMs: Math.max(1000, p.data.timeMs) });
  return r ? { ok: true as const, data: r } : { ok: false as const, error: "Question not found." };
}

export async function setMistakeType(input: { attemptId: string; type: string }) {
  const { userId } = await requireUser();
  const p = z.object({ attemptId: z.uuid(), type: z.enum(MISTAKE_TYPES) }).safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid mistake type." };
  await db.update(attempts).set({ mistakeType: p.data.type })
    .where(and(eq(attempts.id, p.data.attemptId), eq(attempts.userId, userId), eq(attempts.correct, false)));
  return { ok: true as const, data: undefined };
}

export async function toggleBookmark(input: { questionId: string }) {
  const { userId } = await requireUser();
  const p = z.object({ questionId: id }).safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid question." };
  const key = and(eq(bookmarks.userId, userId), eq(bookmarks.questionId, p.data.questionId));
  const removed = await db.delete(bookmarks).where(key).returning();
  if (!removed.length) await db.insert(bookmarks).values({ userId, questionId: p.data.questionId }).onConflictDoNothing();
  return { ok: true as const, data: { bookmarked: !removed.length } };
}

const Report = z.object({
  questionId: id, reason: z.enum(["wrong_answer", "unclear", "typo", "other"]), note: z.string().max(500).optional(),
});
export async function reportQuestion(input: z.input<typeof Report>) {
  const { userId } = await requireUser();
  const p = Report.safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid report." };
  const [{ c }] = (await db.select({ c: count() }).from(questionReports)
    .where(and(eq(questionReports.userId, userId), gte(questionReports.createdAt, new Date(Date.now() - 86_400_000))))) as [{ c: number }];
  if (c >= 20) return { ok: false as const, error: "You've sent a lot of reports today — thank you! Try again tomorrow." };
  const [q] = await db.select({ id: questions.id }).from(questions).where(eq(questions.id, p.data.questionId));
  if (!q) return { ok: false as const, error: "Question not found." };
  await db.insert(questionReports).values({ userId, ...p.data });
  return { ok: true as const, data: undefined };
}
