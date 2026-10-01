// First-visit-of-the-day side effects (spec 04 §6): weekly focus → daily plan → model score snapshot.
// Idempotent; no cron. The plan is frozen for the day once written.
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, gte, inArray, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, dailyPlans, lessonProgress, scoreSnapshots, skillState, testSessions, type Profile } from "@/db/schema";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { masteryPct } from "@/engine/mastery";
import { buildDailyPlan, dayOfWeekIndex, localDate, paceCheck, questionsForBlock, weekOf, type PlanBlock } from "@/engine/plan";
import { headlineEstimate, sectionEstimate, totalEstimate } from "@/engine/score";
import { ensureWeeklyFocus } from "./plan";
import { lessonExists } from "./lessons";
import { countDueReviews } from "./practice";

async function desmosSlugs(): Promise<string[]> {
  try {
    return (await fs.readdir(path.join(process.cwd(), "content", "desmos"))).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)).sort();
  } catch { return []; }
}

const DAY = 86_400_000;
/** Whole days until the test date (negative once it's past), or null when none is set. */
export const daysToTest = (profile: Profile, now = new Date()) =>
  profile.testDate ? Math.ceil((new Date(`${profile.testDate}T00:00:00Z`).getTime() - now.getTime()) / DAY) : null;

/** First Desmos lesson the student hasn't opened yet. */
export async function nextDesmosLesson(userId: string): Promise<string | null> {
  const [opened, slugs] = await Promise.all([
    db.select({ skillId: lessonProgress.skillId }).from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), like(lessonProgress.skillId, "desmos:%"))),
    desmosSlugs(),
  ]);
  return slugs.find((s) => !opened.some((o) => o.skillId === `desmos:${s}`)) ?? null;
}

/** A full mock is due 14 days after the last one (7 inside the final 4 weeks), or a week after the diagnostic. */
export async function isMockDue(userId: string, daysLeft: number | null, now = new Date()) {
  const [[lastMock], [diag]] = await Promise.all([
    db.select().from(testSessions).where(and(eq(testSessions.userId, userId), eq(testSessions.kind, "full"), eq(testSessions.status, "completed")))
      .orderBy(desc(testSessions.completedAt)).limit(1),
    db.select().from(testSessions).where(and(eq(testSessions.userId, userId), eq(testSessions.kind, "diagnostic"), eq(testSessions.status, "completed"))).limit(1),
  ]);
  const mockGap = daysLeft != null && daysLeft <= 28 ? 7 : 14;
  const due = lastMock?.completedAt
    ? now.getTime() - lastMock.completedAt.getTime() >= mockGap * DAY
    : !!diag?.completedAt && now.getTime() - diag.completedAt.getTime() >= 7 * DAY;
  return { due, lastMock };
}

export async function ensureDaily(userId: string, profile: Profile, now = new Date()) {
  const day = localDate(now, profile.timezone);
  const focus = await ensureWeeklyFocus(userId, profile, now);

  let [plan] = await db.select().from(dailyPlans).where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.day, day)));
  if (!plan) {
    const weekStart = new Date(`${weekOf(day)}T00:00:00Z`);
    const [states, done, weekCounts, nextDesmos, dueReviews, hasLesson] = await Promise.all([
      db.select().from(skillState).where(and(eq(skillState.userId, userId), inArray(skillState.skillId, focus.length ? focus : [""]))),
      db.select({ skillId: lessonProgress.skillId }).from(lessonProgress).where(eq(lessonProgress.userId, userId)),
      db.select({ skillId: attempts.skillId, n: sql<number>`count(*)::int` }).from(attempts)
        .where(and(eq(attempts.userId, userId), gte(attempts.createdAt, weekStart))).groupBy(attempts.skillId),
      nextDesmosLesson(userId),
      countDueReviews(userId, now),
      Promise.all(focus.map(lessonExists)),
    ]);
    const blocks = buildDailyPlan({
      minutes: profile.minutesPerDay,
      dueReviews,
      focus: focus.map((skillId) => ({
        skillId, section: SKILL_BY_ID[skillId]!.section,
        masteryPct: masteryPct(states.find((s) => s.skillId === skillId)?.theta ?? 0),
        // No lesson written yet → nothing to learn; plan practice instead.
        lessonDone: done.some((d) => d.skillId === skillId) || !hasLesson[focus.indexOf(skillId)],
        attemptsThisWeek: weekCounts.find((w) => w.skillId === skillId)?.n ?? 0,
      })),
      nextDesmosLesson: nextDesmos,
      dayOfWeekIndex: dayOfWeekIndex(day),
      daysToTest: daysToTest(profile, now),
    });
    [plan] = await db.insert(dailyPlans).values({ userId, day, blocks }).onConflictDoNothing().returning();
    plan ??= (await db.select().from(dailyPlans).where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.day, day))))[0]!;
  }

  // At most one model snapshot per local day, and only when there's new evidence.
  const [last] = await db.select().from(scoreSnapshots).where(eq(scoreSnapshots.userId, userId)).orderBy(desc(scoreSnapshots.takenAt)).limit(1);
  if (!last || localDate(last.takenAt, profile.timezone) !== day) {
    const [newer] = await db.select({ id: attempts.id }).from(attempts)
      .where(and(eq(attempts.userId, userId), last ? gte(attempts.createdAt, last.takenAt) : undefined)).limit(1);
    if (newer) {
      const states = await db.select().from(skillState).where(eq(skillState.userId, userId));
      const rw = sectionEstimate(states, "rw"), math = sectionEstimate(states, "math");
      await db.insert(scoreSnapshots).values({ userId, source: "model", rw: rw.score, math: math.score, halfWidth: totalEstimate(rw, math).half, takenAt: now });
    }
  }
  return { day, focus, blocks: plan.blocks as PlanBlock[] };
}

export async function getDashboard(userId: string, profile: Profile, now = new Date()) {
  const daily = await ensureDaily(userId, profile, now);
  const daysLeft = daysToTest(profile, now);
  const [states, dueReviews, { due: mockDue, lastMock }, week] = await Promise.all([
    db.select().from(skillState).where(eq(skillState.userId, userId)),
    countDueReviews(userId, now),
    isMockDue(userId, daysLeft, now),
    db.select({ n: sql<number>`count(*)::int`, c: sql<number>`count(*) filter (where ${attempts.correct})::int`, ms: sql<number>`coalesce(sum(${attempts.timeMs}),0)::bigint` })
      .from(attempts).where(and(eq(attempts.userId, userId), gte(attempts.createdAt, new Date(now.getTime() - 7 * DAY)))),
  ]);

  const rw = sectionEstimate(states, "rw"), math = sectionEstimate(states, "math");
  const model = totalEstimate(rw, math);
  const mockResult = lastMock && lastMock.completedAt && now.getTime() - lastMock.completedAt.getTime() <= 30 * DAY
    ? (lastMock.result as { total?: number; halfWidth?: number } | null) : null;
  const headline = headlineEstimate(model, mockResult?.total ? { total: mockResult.total, half: mockResult.halfWidth ?? 40 } : null);

  const stretch = profile.targetScore && daysLeft && daysLeft > 0
    ? paceCheck(headline.total, profile.targetScore, daysLeft) === "stretch" : false;

  const w = week[0]!;
  return {
    ...daily, estimate: { ...headline, rw: rw.score, math: math.score }, dueReviews, daysLeft, mockDue, stretch,
    week: { answered: w.n, accuracy: w.n ? Math.round((100 * w.c) / w.n) : null, minutes: Math.round(Number(w.ms) / 60000) },
    focusMastery: daily.focus.map((id) => ({ id, name: SKILL_BY_ID[id]!.name, mastery: masteryPct(states.find((s) => s.skillId === id)?.theta ?? 0) })),
  };
}

export async function completeBlock(userId: string, profile: Profile, index: number, done = true) {
  const day = localDate(new Date(), profile.timezone);
  await db.update(dailyPlans)
    .set({ blocks: sql`jsonb_set(${dailyPlans.blocks}, ${`{${index},done}`}::text[], ${done ? "true" : "false"}::jsonb)` })
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.day, day), sql`jsonb_array_length(${dailyPlans.blocks}) > ${index}`));
}

/** Today's plan block by index, with how many answers complete it (spec 03 §10 block completion). */
export async function getTodayBlock(userId: string, profile: Profile, index: number) {
  const day = localDate(new Date(), profile.timezone);
  const [plan] = await db.select().from(dailyPlans).where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.day, day)));
  const b = (plan?.blocks as PlanBlock[] | undefined)?.[index];
  if (!b || b.done) return null;
  const section = "skillId" in b ? SKILL_BY_ID[b.skillId]?.section ?? "rw" : "rw";
  return { index, target: questionsForBlock(b.minutes, section) };
}

/** Today's plan row, without generating one. */
export async function getTodayPlan(userId: string, profile: Profile) {
  const day = localDate(new Date(), profile.timezone);
  const [plan] = await db.select().from(dailyPlans).where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.day, day)));
  return plan ? (plan.blocks as PlanBlock[]) : null;
}

/** Hand-edit today's plan (it stays frozen for the day). Every block is marked custom so the UI can say so. */
export async function editTodayPlan(userId: string, profile: Profile, edit: (blocks: PlanBlock[]) => PlanBlock[]) {
  const { day, blocks } = await ensureDaily(userId, profile);
  const next = edit(blocks).map((b) => ({ ...b, custom: true as const }));
  await db.update(dailyPlans).set({ blocks: next }).where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.day, day)));
}

/** Back to the automatic plan: drop today's row so ensureDaily regenerates it. */
export async function resetTodayPlan(userId: string, profile: Profile) {
  const day = localDate(new Date(), profile.timezone);
  await db.delete(dailyPlans).where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.day, day)));
}

export const DASHBOARD_CARDS = [
  { id: "score", label: "Your score" },
  { id: "countdown", label: "SAT countdown" },
  { id: "today", label: "Today's plan" },
  { id: "focus", label: "Focus this week" },
  { id: "mock-due", label: "Full mock due" },
  { id: "pace", label: "Pace check" },
  { id: "mistakes", label: "Mistakes to review" },
  { id: "week", label: "Last 7 days" },
] as const;
export type DashboardCardId = (typeof DASHBOARD_CARDS)[number]["id"];

/** The saved layout with any cards added since appended (visible); null = automatic default. */
export function dashboardLayout(profile: Profile): { id: DashboardCardId; visible: boolean }[] | null {
  if (!profile.dashboardLayout) return null;
  const ids = DASHBOARD_CARDS.map((c) => c.id) as string[];
  const saved = profile.dashboardLayout.filter((c) => ids.includes(c.id)) as { id: DashboardCardId; visible: boolean }[];
  return [...saved, ...DASHBOARD_CARDS.filter((c) => !saved.some((s) => s.id === c.id)).map((c) => ({ id: c.id, visible: true }))];
}
