"use server";

import { z } from "zod";
import { requireUser } from "@/server/auth";
import { answerDiagnostic as answer } from "@/server/diagnostic";

const Answer = z.object({
  sessionId: z.uuid(),
  questionId: z.string().min(1).max(64),
  response: z.string().max(8).nullable(),
  timeMs: z.number().int().min(0).max(24 * 3_600_000),
});

export async function answerDiagnostic(input: z.input<typeof Answer>) {
  const { userId } = await requireUser();
  const parsed = Answer.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid answer." };
  return answer(userId, parsed.data);
}
