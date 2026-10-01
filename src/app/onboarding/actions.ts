"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles, satAttempts, skillState } from "@/db/schema";
import { SKILLS, SUBJECTS, TOPICS, boardTopics } from "@/content/taxonomy";
import { priorTheta, type SelfRating } from "@/engine/prior";
import { requireUser, type ActionResult } from "@/server/auth";
import { startDiagnostic } from "@/server/diagnostic";

const MINUTES = [15, 30, 45, 60, 90, 120];
const sectionScore =z.number().int().min(200).max(800).multipleOf(10);
const Survey = z.object({
  grade: z.number().int().min(8).max(13),
  curriculum: z.enum(["cbse", "icse", "ib", "gcse", "american", "other"]),
  topicsStudied: z.array(z.enum(TOPICS.map((t) => t.id) as [string, ...string[]])),
  subjects: z.array(z.enum(SUBJECTS)).default([]),
  englishBackground: z.enum(["first_language", "fluent", "learning"]),
  prior: z.object({ math: sectionScore, rw: sectionScore, takenOn: z.iso.date() }).nullable(),
  targetScore: z.number().int().min(400).max(1600).multipleOf(10),
  testDate: z.iso.date().nullable(),
  minutesPerDay: z.number().refine((n) => MINUTES.includes(n)),
  daysPerWeek: z.number().int().min(3).max(7),
  timezone: z.string().refine((tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } }),
});

export async function submitSurvey(input: z.input<typeof Survey>): Promise<ActionResult> {
  const { userId, profile } = await requireUser();
  if (profile.onboardingStep !== "survey") return { ok: false, error: "Survey already submitted." };
  const parsed = Survey.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted answers." };
  const s = parsed.data;
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({
      grade: s.grade, curriculum: s.curriculum, topicsStudied: s.topicsStudied, subjects: s.subjects, englishBackground: s.englishBackground,
      priorMath: s.prior?.math ?? null, priorRw: s.prior?.rw ?? null, targetScore: s.targetScore, testDate: s.testDate,
      minutesPerDay: s.minutesPerDay, daysPerWeek: s.daysPerWeek, timezone: s.timezone, onboardingStep: "self",
    }).where(eq(profiles.id, userId));
    if (s.prior) await tx.insert(satAttempts).values({ userId, takenOn: s.prior.takenOn, math: s.prior.math, rw: s.prior.rw });
  });
  revalidatePath("/onboarding");
  return { ok: true, data: undefined };
}

const Ratings = z.record(z.string(), z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).nullable());

export async function submitSelfAssessment(input: z.input<typeof Ratings>): Promise<ActionResult> {
  const { userId, profile } = await requireUser();
  if (profile.onboardingStep !== "self") return { ok: false, error: "Self-assessment already submitted." };
  const parsed = Ratings.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid ratings." };
  const studied = new Set(TOPICS.filter((t) => profile.topicsStudied.includes(t.id)).flatMap((t) => t.skills));
  const implied = new Set(TOPICS.filter((t) => boardTopics(profile.curriculum, profile.grade).includes(t.id)).flatMap((t) => t.skills));
  const rows = SKILLS.map((s) => {
    const selfRating = (parsed.data[s.id] ?? null) as SelfRating | null;
    return {
      userId, skillId: s.id, selfRating,
      theta: priorTheta({
        selfRating, topicStudied: studied.has(s.id), boardImplied: implied.has(s.id),
        priorSectionScore: s.section === "math" ? profile.priorMath : profile.priorRw,
      }),
    };
  });
  await db.transaction(async (tx) => {
    await tx.insert(skillState).values(rows).onConflictDoNothing();
    await tx.update(profiles).set({ onboardingStep: "diagnostic" }).where(eq(profiles.id, userId));
  });
  revalidatePath("/onboarding");
  return { ok: true, data: undefined };
}

export async function skipDiagnostic() {
  const { userId, profile } = await requireUser();
  if (profile.onboardingStep === "diagnostic")
    await db.update(profiles).set({ onboardingStep: "diagnostic_skipped" }).where(eq(profiles.id, userId));
  redirect("/dashboard");
}

export async function beginDiagnostic() {
  const { userId, profile } = await requireUser();
  if (profile.onboardingStep !== "diagnostic" && profile.onboardingStep !== "diagnostic_skipped") redirect("/onboarding");
  const id = await startDiagnostic(userId);
  redirect(`/test/${id}`);
}
