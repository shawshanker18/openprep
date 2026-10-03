"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
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
