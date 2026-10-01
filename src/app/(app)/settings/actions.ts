"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles, satAttempts, testSessions } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { startDiagnostic } from "@/server/diagnostic";

const Settings = z.object({
  targetScore: z.coerce.number().int().min(400).max(1600).multipleOf(10),
  testDate: z.union([z.iso.date(), z.literal("")]),
  minutesPerDay: z.coerce.number().refine((n) => [15, 30, 45, 60, 90, 120].includes(n)),
  daysPerWeek: z.coerce.number().int().min(3).max(7),
});

export async function updateSettings(form: FormData) {
  const { userId } = await requireUser();
  const p = Settings.safeParse(Object.fromEntries(form));
  if (!p.success) redirect("/settings?error=settings");
  await db.update(profiles).set({ ...p.data, testDate: p.data.testDate || null }).where(eq(profiles.id, userId));
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}

const score = z.coerce.number().int().min(200).max(800).multipleOf(10);
export async function addOfficialScore(form: FormData) {
  const { userId } = await requireUser();
  const p = z.object({ takenOn: z.iso.date(), math: score, rw: score }).safeParse(Object.fromEntries(form));
  if (!p.success) redirect("/settings?error=score");
  await db.insert(satAttempts).values({ userId, ...p.data });
  revalidatePath("/settings");
}

export async function removeOfficialScore(id: string) {
  const { userId } = await requireUser();
  if (!z.uuid().safeParse(id).success) return;
  await db.delete(satAttempts).where(and(eq(satAttempts.id, id), eq(satAttempts.userId, userId)));
  revalidatePath("/settings");
}

export async function retakeDiagnostic() {
  const { userId } = await requireUser();
  const [last] = await db.select().from(testSessions)
    .where(and(eq(testSessions.userId, userId), eq(testSessions.kind, "diagnostic"), eq(testSessions.status, "completed")))
    .orderBy(desc(testSessions.completedAt)).limit(1);
  if (last?.completedAt && Date.now() - last.completedAt.getTime() < 30 * 86_400_000) redirect("/settings?error=retake");
  redirect(`/test/${await startDiagnostic(userId)}`);
}

export async function deleteAccount(form: FormData) {
  const { userId } = await requireUser();
  if (form.get("confirm") !== "DELETE") redirect("/settings?error=delete");
  await db.transaction(async (tx) => {
    await tx.delete(profiles).where(eq(profiles.id, userId)); // cascades to every per-user table
    await tx.execute(sql`select app_private.delete_auth_user(${userId}::uuid)`);
  });
  await (await createClient()).auth.signOut();
  redirect("/?deleted=1");
}
