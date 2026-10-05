"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles, satAttempts, skillState } from "@/db/schema";
import { SKILLS, TOPICS, boardTopics } from "@/content/taxonomy";
import { priorTheta, type SelfRating } from "@/engine/prior";
import { requireUser, type ActionResult } from "@/server/auth";
import { startDiagnostic } from "@/server/diagnostic";

import { Survey } from "@/lib/onboarding";

export async function submitSurvey(input: z.input<typeof Survey>): Promise<ActionResult> {
  const { userId, profile } = await requireUser();
  if (profile.onboardingStep !== "survey" && profile.onboardingStep !== "self") return { ok: false, error: "Survey already submitted." };
  const parsed = Survey.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted answers." };
  const s = parsed.data;
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({
      grade: s.grade, curriculum: s.curriculum, topicsStudied: s.topicsStudied, subjects: s.subjects, englishBackground: s.englishBackground,
      priorMath: s.prior?.math ?? null, priorRw: s.prior?.rw ?? null, targetScore: s.targetScore, testDate: s.testDate,
      minutesPerDay: s.minutesPerDay, daysPerWeek: s.daysPerWeek, timezone: s.timezone, onboardingStep: "diagnostic_skipped",
    }).where(eq(profiles.id, userId));
    if (s.prior) await tx.insert(satAttempts).values({ userId, takenOn: s.prior.takenOn, math: s.prior.math, rw: s.prior.rw });
    const studied = new Set(TOPICS.filter((t) => s.topicsStudied.includes(t.id)).flatMap((t) => t.skills));
    const implied = new Set(TOPICS.filter((t) => boardTopics(s.curriculum, s.grade).includes(t.id)).flatMap((t) => t.skills));
    await tx.insert(skillState).values(SKILLS.map((skill) => {
      const selfRating = s.ratings[skill.id] ?? null;
      return { userId, skillId: skill.id, selfRating, theta: priorTheta({
        selfRating, topicStudied: studied.has(skill.id), boardImplied: implied.has(skill.id),
        priorSectionScore: skill.section === "math" ? s.prior?.math ?? null : s.prior?.rw ?? null,
      }) };
    })).onConflictDoNothing();
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
