// First-visit-of-the-day side effects (spec 04 §6): weekly focus → daily plan → model score snapshot.
// Idempotent; no cron. The plan is frozen for the day once written.
import "server-only";
import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";
import { and, count, desc, eq, gte, inArray, like, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, dailyPlans, lessonProgress, scoreSnapshots, skillState, testSessions, type Profile } from "@/db/schema";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { masteryPct } from "@/engine/mastery";
import { buildDailyPlan, dayOfWeekIndex, localDate, paceCheck, questionsForBlock, streak, weekOf, type PlanBlock } from "@/engine/plan";
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

/** Per-request memos: the layout (notifications) and the page ask the same questions. */
export const mockDueNow = cache((userId: string, daysLeft: number | null) => isMockDue(userId, daysLeft));
export const dueReviewsNow = cache((userId: string) => countDueReviews(userId));
export const skillStatesOf = cache((userId: string) => db.select().from(skillState).where(eq(skillState.userId, userId)));

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
  return { day, focus, blocks: await withProgress(userId, profile, day, plan.blocks as PlanBlock[]) };
}

export type PlanBlockStatus = PlanBlock & { progress: { n: number; target: number } | null };

/** Answers that complete a practice, check-in or review block (review blocks use the R&W pace). */
const blockTarget = (b: PlanBlock) => questionsForBlock(b.minutes, "skillId" in b ? SKILL_BY_ID[b.skillId]?.section ?? "rw" : "rw");

/**
 * A plan block is done only when the work is really there, worked out from the database every time (a click can't
 * tick it): practice and check-in blocks need that many answers on the skill today, review blocks that many review
 * answers today, learn and Desmos blocks the lesson finished today. Blocks on the same skill share today's answers
 * in order, so one set of answers never completes two blocks.
 */
export async function withProgress(userId: string, profile: Profile, day: string, blocks: PlanBlock[]): Promise<PlanBlockStatus[]> {
  const onDay = (col: typeof attempts.createdAt | typeof lessonProgress.completedAt) => sql`(${col} at time zone ${profile.timezone})::date = ${day}::date`;
  const [answered, lessons] = await Promise.all([
    db.select({ skillId: attempts.skillId, context: attempts.context, n: count() }).from(attempts)
      // The UTC range (the local day, widened 14 hours each way for any time zone) lets the (user_id, created_at)
      // index skip the student's older answers; onDay then picks the exact local day.
      .where(and(eq(attempts.userId, userId), inArray(attempts.context, ["practice", "review"]),
        gte(attempts.createdAt, new Date(Date.parse(`${day}T00:00:00Z`) - 14 * 3_600_000)),
        lt(attempts.createdAt, new Date(Date.parse(`${day}T00:00:00Z`) + 38 * 3_600_000)), onDay(attempts.createdAt)))
      .groupBy(attempts.skillId, attempts.context),
    db.select({ skillId: lessonProgress.skillId }).from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), onDay(lessonProgress.completedAt))),
  ]);
  const pool = new Map<string, number>(); // "review" or "practice:<skillId>" → answers not yet used by a block
  for (const a of answered) {
    const key = a.context === "review" ? "review" : `practice:${a.skillId}`;
    pool.set(key, (pool.get(key) ?? 0) + a.n);
  }
  const read = new Set(lessons.map((l) => l.skillId));
  return blocks.map((b) => {
    if (b.kind === "learn") return { ...b, done: read.has(b.skillId), progress: null };
    if (b.kind === "desmos") return { ...b, done: read.has(`desmos:${b.lessonSlug}`), progress: null };
    const key = b.kind === "review" ? "review" : `practice:${b.skillId}`;
    const target = blockTarget(b), have = pool.get(key) ?? 0, n = Math.min(have, target);
    pool.set(key, have - n);
    return { ...b, done: n >= target, progress: { n, target } };
  });
}

export async function getDashboard(userId: string, profile: Profile, now = new Date()) {
  const daily = await ensureDaily(userId, profile, now);
  const daysLeft = daysToTest(profile, now);
  const [states, dueReviews, { due: mockDue, lastMock }, week] = await Promise.all([
    skillStatesOf(userId),
    dueReviewsNow(userId),
    mockDueNow(userId, daysLeft),
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

/** Today's plan block by index, with how many more answers complete it (spec 03 §10 block completion). */
export async function getTodayBlock(userId: string, profile: Profile, index: number) {
  const b = (await getTodayPlan(userId, profile))?.[index];
  if (!b || b.done || !b.progress) return null;
  return { index, target: b.progress.target - b.progress.n };
}

/** Today's plan with real progress, without generating one. */
export async function getTodayPlan(userId: string, profile: Profile) {
  const day = localDate(new Date(), profile.timezone);
  const [plan] = await db.select().from(dailyPlans).where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.day, day)));
  return plan ? withProgress(userId, profile, day, plan.blocks as PlanBlock[]) : null;
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
  { id: "today", label: "Today's plan" },
  { id: "focus", label: "Focus this week" },
  { id: "mock-due", label: "Full mock due" },
  { id: "pace", label: "Pace check" },
  { id: "mistakes", label: "Mistakes to review" },
  { id: "week", label: "Last 7 days" },
  { id: "course", label: "Skill mastery" },
  { id: "official", label: "Add your SAT scores" },
] as const;
export type DashboardCardId = (typeof DASHBOARD_CARDS)[number]["id"];

/** The saved layout with any cards added since appended (visible); null = automatic default. */
export function dashboardLayout(profile: Profile): { id: DashboardCardId; visible: boolean }[] | null {
  if (!profile.dashboardLayout) return null;
  const ids = DASHBOARD_CARDS.map((c) => c.id) as string[];
  const saved = profile.dashboardLayout.filter((c) => ids.includes(c.id)) as { id: DashboardCardId; visible: boolean }[];
  return [...saved, ...DASHBOARD_CARDS.filter((c) => !saved.some((s) => s.id === c.id)).map((c) => ({ id: c.id, visible: true }))];
}

/** Study streak in the student's timezone: distinct local days with an answer, last ~13 months. */
export const getStreak = cache(async (userId: string, timezone: string) => {
  const rows = await db.execute<{ d: string }>(sql`
    select distinct (created_at at time zone ${timezone})::date::text as d from attempts
    where user_id = ${userId} and created_at > now() - interval '400 days'`);
  return streak(rows.map((r) => r.d), localDate(new Date(), timezone));
});
