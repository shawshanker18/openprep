"use server";

import { DeliveryBlocked } from "@/server/delivery-policy";
import { limitPractice } from "@/server/ratelimit";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { text } from "@/lib/text";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { internalId } from "@/server/questions";
import { answerDiagnostic as answer } from "@/server/diagnostic";
import { abandonTest, saveResponse as save, startModule as start } from "@/server/tests";

const Answer = z.object({
  sessionId: z.uuid(),
  questionId: text().min(1).max(64),
  response: text().max(8).nullable(),
  timeMs: z.number().int().min(0).max(24 * 3_600_000),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable().optional(),
});

export async function answerDiagnostic(input: z.input<typeof Answer>) {
  const { userId } = await requireUser();
  const parsed = Answer.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid answer." };
  const questionId = await internalId(parsed.data.questionId, userId);
  if (!questionId) return { ok: false as const, error: "That question was already answered. Reload to continue." };
  const limited=await limitPractice(userId,"answer",questionId);
  if(limited) return {ok:false as const,error:limited};
  try { return await answer(userId, { ...parsed.data, questionId }); } catch(e) { if(e instanceof DeliveryBlocked) return {ok:false as const,error:e.message}; throw e; }
}

export async function startModule(moduleId: string) {
  const { userId } = await requireUser();
  if (!z.uuid().safeParse(moduleId).success) return false;
  if(await limitPractice(userId,"request")) return false;
  try { return await start(userId, moduleId); } catch(e) { if(e instanceof DeliveryBlocked) return false; throw e; }
}

const Save = z.object({
  moduleId: z.uuid(), position: z.number().int().min(0).max(100),
  response: text().max(8).nullable(), flagged: z.boolean(), timeMsDelta: z.number().int().min(0).max(3_600_000),
});
export async function saveResponse(input: z.input<typeof Save>) {
  const { userId } = await requireUser();
  const p = Save.safeParse(input);
  if (!p.success) return { ok: false as const, error: "Invalid answer." };
  return save(userId, p.data);
}

/** End a diagnostic early: answers so far are kept, the student carries on (as if skipped) and can retake it later. */
export async function endDiagnostic(sessionId: string) {
  const { userId, profile } = await requireUser();
  if (z.uuid().safeParse(sessionId).success) await abandonTest(userId, sessionId);
  if (profile.onboardingStep === "diagnostic")
    await db.update(profiles).set({ onboardingStep: "diagnostic_skipped" }).where(eq(profiles.id, userId));
  redirect("/dashboard");
}

export async function abandon(sessionId: string) {
  const { userId } = await requireUser();
  if (z.uuid().safeParse(sessionId).success) await abandonTest(userId, sessionId);
  // Server actions can otherwise leave the tests page showing the old in-progress row
  // until a hard refresh, which also makes the start guard look like it did not clear.
  revalidatePath("/tests");
  revalidatePath("/dashboard");
  redirect("/tests");
}

