"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { startCheckpoint, startConceptPractice } from "@/server/concepts";
import { nextAfter, scratchProgress, setStep } from "@/server/scratch";

/** Finish or skip one step, then open the next step still to do (or the overview at the end of the path). */
export async function stepAction(key: string, action: "done" | "skip") {
  const { userId } = await requireUser();
  const { steps } = await scratchProgress(userId);
  const step = steps.find((s) => s.key === key);
  if (!step || (action !== "done" && action !== "skip")) return;
  await setStep(userId, step, action);
  revalidatePath("/start", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/plan");
  if (step.kind === "skill") revalidatePath(`/skills/${step.ref}`);
  if (step.kind === "desmos") revalidatePath("/desmos");
  const next = nextAfter(steps.map((s) => (s.key === key ? { ...s, status: action === "done" ? "done" : "skipped" } : s)), key);
  redirect(next ? `/start/${next.key}` : "/start");
}

/** Practise one concept of a skill. Only after the student has finished that skill's lesson. */
export async function conceptPracticeAction(key: string, conceptId: string) {
  const { userId } = await requireUser();
  const { steps } = await scratchProgress(userId);
  const step = steps.find((s) => s.key === key);
  if (!step || step.kind !== "skill" || step.status !== "done" || !z.uuid().safeParse(conceptId).success) return;
  const sessionId = await startConceptPractice(userId, conceptId);
  if (sessionId) redirect(`/practice?session=${sessionId}`);
}

/** A checkpoint on one skill: concept questions first, then skill questions. Returns to this lesson when the set ends. */
export async function checkpointAction(key: string) {
  const { userId } = await requireUser();
  const { steps } = await scratchProgress(userId);
  const step = steps.find((s) => s.key === key);
  if (!step || step.kind !== "skill" || !/^[a-z0-9-]+$/.test(step.key)) return;
  const sessionId = await startCheckpoint(userId, step.ref, `Checkpoint: ${step.title}`, `/start/${step.key}`);
  if (sessionId) redirect(`/practice?session=${sessionId}`);
}
