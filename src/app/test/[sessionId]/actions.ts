"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { text } from "@/lib/text";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { internalId } from "@/server/questions";
import { answerDiagnostic as answer } from "@/server/diagnostic";
import { abandonTest, markLocked, recordFocusLoss, saveResponse as save, startModule as start, submitModule as submit } from "@/server/tests";

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
  const questionId = await internalId(parsed.data.questionId);
  if (!questionId) return { ok: false as const, error: "That question was already answered. Reload to continue." };
  return answer(userId, { ...parsed.data, questionId });
}

export async function startModule(moduleId: string) {
  const { userId } = await requireUser();
  if (!z.uuid().safeParse(moduleId).success) return false;
  return start(userId, moduleId);
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

export async function submitModule(moduleId: string) {
  const { userId } = await requireUser();
  if (!z.uuid().safeParse(moduleId).success) return false;
  return submit(userId, moduleId);
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
  redirect("/tests");
}

/** The test is running in an app's lockdown mode: from now on it can only be continued in an app. */
export async function markLockdown(sessionId: string) {
  const { userId } = await requireUser();
  if (z.uuid().safeParse(sessionId).success) await markLocked(userId, sessionId);
}

/** The student left the test window (tab switch, app switch, or lost focus). Counted on the results page. */
export async function reportFocusLoss(sessionId: string) {
  const { userId } = await requireUser();
  if (z.uuid().safeParse(sessionId).success) await recordFocusLoss(userId, sessionId);
}
