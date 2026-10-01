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

export async function ensureDaily(userId: string, profile: Profile, now = new Date()) {
  const day = localDate(now, profile.timezone);
  const focus = await ensureWeeklyFocus(userId, profile, now);

  let [plan] = await db.select().from(dailyPlans).where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.day, day)));
  if (!plan) {
    const weekStart = new Date(`${weekOf(day)}T00:00:00Z`);
    const [states, done, weekCounts, opened, slugs, dueReviews, hasLesson] = await Promise.all([
      db.select().from(skillState).where(and(eq(skillState.userId, userId), inArray(skillState.skillId, focus.length ? focus : [""]))),
      db.select({ skillId: lessonProgress.skillId }).from(lessonProgress).where(eq(lessonProgress.userId, userId)),
      db.select({ skillId: attempts.skillId, n: sql<number>`count(*)::int` }).from(attempts)
        .where(and(eq(attempts.userId, userId), gte(attempts.createdAt, weekStart))).groupBy(attempts.skillId),
      db.select({ skillId: lessonProgress.skillId }).from(lessonProgress)
        .where(and(eq(lessonProgress.userId, userId), like(lessonProgress.skillId, "desmos:%"))),
      desmosSlugs(),
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
      nextDesmosLesson: slugs.find((s) => !opened.some((o) => o.skillId === `desmos:${s}`)) ?? null,
      dayOfWeekIndex: dayOfWeekIndex(day),
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
  const DAY = 86_400_000;
  const [states, dueReviews, [lastMock], [diag], week] = await Promise.all([
    db.select().from(skillState).where(eq(skillState.userId, userId)),
    countDueReviews(userId, now),
    db.select().from(testSessions).where(and(eq(testSessions.userId, userId), eq(testSessions.kind, "full"), eq(testSessions.status, "completed")))
      .orderBy(desc(testSessions.completedAt)).limit(1),
    db.select().from(testSessions).where(and(eq(testSessions.userId, userId), eq(testSessions.kind, "diagnostic"), eq(testSessions.status, "completed"))).limit(1),
    db.select({ n: sql<number>`count(*)::int`, c: sql<number>`count(*) filter (where ${attempts.correct})::int`, ms: sql<number>`coalesce(sum(${attempts.timeMs}),0)::bigint` })
      .from(attempts).where(and(eq(attempts.userId, userId), gte(attempts.createdAt, new Date(now.getTime() - 7 * DAY)))),
  ]);

  const rw = sectionEstimate(states, "rw"), math = sectionEstimate(states, "math");
  const model = totalEstimate(rw, math);
  const mockResult = lastMock && lastMock.completedAt && now.getTime() - lastMock.completedAt.getTime() <= 30 * DAY
    ? (lastMock.result as { total?: number; halfWidth?: number } | null) : null;
  const headline = headlineEstimate(model, mockResult?.total ? { total: mockResult.total, half: mockResult.halfWidth ?? 40 } : null);

  const daysLeft = profile.testDate ? Math.ceil((new Date(`${profile.testDate}T00:00:00Z`).getTime() - now.getTime()) / DAY) : null;
  const mockGap = daysLeft != null && daysLeft <= 28 ? 7 : 14;
  const mockDue = lastMock?.completedAt
    ? now.getTime() - lastMock.completedAt.getTime() >= mockGap * DAY
    : !!diag?.completedAt && now.getTime() - diag.completedAt.getTime() >= 7 * DAY;
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
