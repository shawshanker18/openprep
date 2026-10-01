// Weekly focus (spec 03 §5.1). Frozen for the ISO week; recomputed on the first visit of a new week.
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, questions, skillState, type Profile } from "@/db/schema";
import { SKILLS, skillWeight } from "@/content/taxonomy";
import { localDate, weekOf } from "@/engine/plan";
import { sectionTarget, targetTheta } from "@/engine/score";
import { skillPriority, weeklyFocus } from "@/engine/select";

/** Skills that have at least one active question — you can't focus practice on a skill with no questions. */
export async function skillsWithQuestions(): Promise<Set<string>> {
  const rows = await db.selectDistinct({ skillId: questions.skillId }).from(questions).where(eq(questions.status, "active"));
  return new Set(rows.map((r) => r.skillId));
}

/** All skills in priority order (highest expected score gain first), restricted to skills with questions. */
export async function skillsByPriority(userId: string, profile: Profile) {
  const [states, available] = await Promise.all([
    db.select().from(skillState).where(eq(skillState.userId, userId)),
    skillsWithQuestions(),
  ]);
  const tt = targetTheta(sectionTarget(profile.targetScore ?? 1200));
  return SKILLS.map((s, order) => {
    const st = states.find((x) => x.skillId === s.id);
    return { skillId: s.id, section: s.section, order, weight: skillWeight(s), theta: st?.theta ?? 0, n: st?.n ?? 0, targetTheta: tt };
  }).filter((s) => available.has(s.skillId))
    .sort((a, b) => skillPriority(b) - skillPriority(a) || a.n - b.n || a.order - b.order);
}

export async function ensureWeeklyFocus(userId: string, profile: Profile, now = new Date()): Promise<string[]> {
  const week = weekOf(localDate(now, profile.timezone));
  if (profile.weeklyFocus?.weekOf === week) return profile.weeklyFocus.skillIds;
  const skillIds = weeklyFocus(await skillsByPriority(userId, profile));
  await db.update(profiles).set({ weeklyFocus: { weekOf: week, skillIds } }).where(eq(profiles.id, userId));
  return skillIds;
}
