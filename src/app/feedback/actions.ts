"use server";

import { and, count, eq, gte, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { text } from "@/lib/text";
import { getUserId, type ActionResult } from "@/server/auth";
import { clientIp } from "@/server/signup";

export type FeedbackKind = "bug" | "error" | "review" | "idea" | "other";
const KINDS = ["bug", "error", "review", "idea", "other"] as const;
const MAX_PER_DAY = 15; // per account, and per network (signed-out visitors share it)

const Input = z.object({
  kind: z.enum(KINDS, "Choose what kind of feedback this is."),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  message: text().trim().min(5, "Please write a few words (at least 5 characters).").max(4000, "Please keep it under 4,000 characters."),
  page: text().max(300).regex(/^\/[^\s]*$/).nullable().optional(),
  contact: text().trim().max(200, "Keep the contact under 200 characters.").optional(),
});

/** Feedback from anyone, signed in or not. Stored for the admins' inbox (/admin). */
export async function sendFeedback(input: z.input<typeof Input>): Promise<ActionResult> {
  const p = Input.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Please check the form." };
  const [userId, ip] = await Promise.all([getUserId(), clientIp()]);
  const since = new Date(Date.now() - 86_400_000);
  const [{ n }] = (await db.select({ n: count() }).from(feedback)
    .where(and(gte(feedback.createdAt, since), userId ? or(eq(feedback.userId, userId), eq(feedback.ip, ip)) : eq(feedback.ip, ip)))) as [{ n: number }];
  if (n >= MAX_PER_DAY) return { ok: false, error: "You've sent a lot of feedback today. Thank you! You can send more tomorrow." };
  await db.insert(feedback).values({
    userId, ip, kind: p.data.kind, message: p.data.message, page: p.data.page ?? null, contact: p.data.contact || null,
    rating: p.data.kind === "review" ? (p.data.rating ?? null) : null,
  });
  return { ok: true, data: undefined };
}
