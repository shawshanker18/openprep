"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { SKILL_BY_ID } from "@/content/taxonomy";
import type { PlanBlock } from "@/engine/plan";
import { diagnosticPending, requireUser } from "@/server/auth";
import { completeBlock, editTodayPlan, nextDesmosLesson, resetTodayPlan } from "@/server/daily";

const MAX_BLOCKS = 11; // setBlockDone accepts indexes 0–10

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/plan");
}

export async function setBlockDone(index: number, done: boolean) {
  const { userId, profile } = await requireUser();
  const p = z.object({ index: z.number().int().min(0).max(10), done: z.boolean() }).safeParse({ index, done });
  if (!p.success) return;
  await completeBlock(userId, profile, p.data.index, p.data.done);
  refresh();
}

const NewBlock = z.object({
  kind: z.enum(["practice", "learn", "review", "mini", "desmos"]),
  skillId: z.string().optional(),
  minutes: z.coerce.number().int().min(5).max(60),
});

export async function addPlanBlock(form: FormData) {
  const { userId, profile } = await requireUser();
  if (diagnosticPending(profile)) return;
  const p = NewBlock.safeParse(Object.fromEntries(form));
  if (!p.success) redirect("/plan?error=block");
  const { kind, skillId, minutes } = p.data;
  let block: PlanBlock;
  if (kind === "review") block = { kind, minutes, done: false };
  else if (kind === "desmos") {
    const lessonSlug = await nextDesmosLesson(userId);
    if (!lessonSlug) redirect("/plan?error=desmos");
    block = { kind, minutes, lessonSlug, done: false };
  } else {
    if (!skillId || !SKILL_BY_ID[skillId]) redirect("/plan?error=block");
    block = { kind, minutes, skillId, done: false };
  }
  await editTodayPlan(userId, profile, (blocks) => (blocks.length < MAX_BLOCKS ? [...blocks, block] : blocks));
  refresh();
}

export async function removePlanBlock(index: number) {
  const { userId, profile } = await requireUser();
  if (diagnosticPending(profile) || !z.number().int().min(0).max(10).safeParse(index).success) return;
  await editTodayPlan(userId, profile, (blocks) => blocks.filter((_, i) => i !== index));
  refresh();
}

export async function resetPlan() {
  const { userId, profile } = await requireUser();
  await resetTodayPlan(userId, profile);
  refresh();
}
