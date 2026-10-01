"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles, satAttempts, testSessions } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { SUBJECTS, TOPICS } from "@/content/taxonomy";
import { requireUser } from "@/server/auth";
import { DASHBOARD_CARDS } from "@/server/daily";
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

const ProfileForm = z.object({
  grade: z.coerce.number().int().min(8).max(13),
  curriculum: z.enum(["cbse", "icse", "ib", "gcse", "american", "other"]),
  subjects: z.array(z.enum(SUBJECTS)),
  topicsStudied: z.array(z.enum(TOPICS.map((t) => t.id) as [string, ...string[]])),
  englishBackground: z.enum(["first_language", "fluent", "learning"]),
});

export async function updateProfile(form: FormData) {
  const { userId } = await requireUser();
  const p = ProfileForm.safeParse({
    grade: form.get("grade"), curriculum: form.get("curriculum"), englishBackground: form.get("englishBackground"),
    subjects: form.getAll("subjects"), topicsStudied: form.getAll("topicsStudied"),
  });
  if (!p.success) redirect("/settings?error=profile");
  await db.update(profiles).set(p.data).where(eq(profiles.id, userId));
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

const CARD_IDS = DASHBOARD_CARDS.map((c) => c.id) as [string, ...string[]];
/** One form: hidden `order` inputs, `visible` checkboxes, and ▲/▼ buttons that submit `move=<id>:<-1|1>`. */
export async function saveDashboard(form: FormData) {
  const { userId } = await requireUser();
  const p = z.object({
    order: z.array(z.enum(CARD_IDS)).length(CARD_IDS.length).refine((a) => new Set(a).size === a.length),
    visible: z.array(z.enum(CARD_IDS)),
    move: z.string().regex(/^[a-z-]+:(-1|1)$/).nullable(),
  }).safeParse({ order: form.getAll("order"), visible: form.getAll("visible"), move: form.get("move") });
  if (!p.success) redirect("/settings?error=dashboard");
  const order = [...p.data.order];
  if (p.data.move) {
    const [id, dir] = p.data.move.split(":");
    const i = order.indexOf(id!), j = i + Number(dir);
    if (i >= 0 && j >= 0 && j < order.length) [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const layout = order.map((id) => ({ id, visible: p.data.visible.includes(id) }));
  await db.update(profiles).set({ dashboardLayout: layout }).where(eq(profiles.id, userId));
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function resetDashboard() {
  const { userId } = await requireUser();
  await db.update(profiles).set({ dashboardLayout: null }).where(eq(profiles.id, userId));
  revalidatePath("/settings");
  revalidatePath("/dashboard");
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
