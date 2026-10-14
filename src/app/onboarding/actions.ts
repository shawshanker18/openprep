"use server";

import { refreshCourseAssignment } from "@/server/course-assignment";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { profiles, satAttempts, skillState } from "@/db/schema";
import { SKILLS, TOPICS, boardTopics } from "@/content/taxonomy";
import { priorTheta } from "@/engine/prior";
import { savedChapters, skillsFromChapters } from "@/content/cbse-chapters";
import { requireUser, type ActionResult } from "@/server/auth";

import { Survey } from "@/lib/onboarding";

export async function submitSurvey(input: z.input<typeof Survey>): Promise<ActionResult> {
  const { userId, profile } = await requireUser();
  if (profile.onboardingStep !== "survey" && profile.onboardingStep !== "self") return { ok: false, error: "Survey already submitted." };
  const parsed = Survey.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted answers." };
  const s = parsed.data;
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({
      grade: s.grade, curriculum: s.curriculum, topicsStudied: s.topicsStudied, chaptersDone: savedChapters(s.chaptersDone, s.grade, s.curriculum), subjects: s.subjects, englishBackground: s.englishBackground,
      priorMath: s.prior?.math ?? null, priorRw: s.prior?.rw ?? null, targetScore: s.targetScore, testDate: s.testDate,
      minutesPerDay: s.minutesPerDay, daysPerWeek: s.daysPerWeek, timezone: s.timezone, onboardingStep: "diagnostic_skipped",
    }).where(eq(profiles.id, userId));
    if (s.prior) await tx.insert(satAttempts).values({ userId, takenOn: s.prior.takenOn, math: s.prior.math, rw: s.prior.rw });
    const studied = new Set([...TOPICS.filter((t) => s.topicsStudied.includes(t.id)).flatMap((t) => t.skills), ...skillsFromChapters(savedChapters(s.chaptersDone, s.grade, s.curriculum))]);
    const implied = new Set(TOPICS.filter((t) => boardTopics(s.curriculum, s.grade).includes(t.id)).flatMap((t) => t.skills));
    await tx.insert(skillState).values(SKILLS.map((skill) => {
      const selfRating = s.ratings[skill.id] ?? null;
      return { userId, skillId: skill.id, selfRating, theta: priorTheta({
        selfRating, topicStudied: studied.has(skill.id), boardImplied: implied.has(skill.id),
        priorSectionScore: skill.section === "math" ? s.prior?.math ?? null : s.prior?.rw ?? null,
      }) };
    })).onConflictDoNothing();
  });
  await refreshCourseAssignment(userId);
  revalidatePath("/onboarding");
  return { ok: true, data: undefined };
}
