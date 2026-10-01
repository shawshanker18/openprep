"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { completeBlock } from "@/server/daily";

export async function setBlockDone(index: number, done: boolean) {
  const { userId, profile } = await requireUser();
  const p = z.object({ index: z.number().int().min(0).max(10), done: z.boolean() }).safeParse({ index, done });
  if (!p.success) return;
  await completeBlock(userId, profile, p.data.index, p.data.done);
  revalidatePath("/dashboard");
  revalidatePath("/plan");
}
