"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { lessonProgress } from "@/db/schema";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { requireUser } from "@/server/auth";

export async function markLessonDone(skillId: string) {
  const { userId } = await requireUser();
  if (!SKILL_BY_ID[skillId]) return;
  await db.insert(lessonProgress).values({ userId, skillId })
    .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.skillId], set: { completedAt: new Date() } });
  revalidatePath("/dashboard");
  revalidatePath("/plan");
  revalidatePath(`/skills/${skillId}`);
}
