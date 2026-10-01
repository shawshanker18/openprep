// Read-side numbers for the student model (spec 03 §11–12). Plain SQL over indexed columns.
import "server-only";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, lessonProgress, questions, reviewItems, satAttempts, scoreSnapshots, skillState } from "@/db/schema";
import { SKILLS, SKILL_BY_ID } from "@/content/taxonomy";
import { masteryPct, pace, status, trend, type Status } from "@/engine/mastery";
import { calibration, type SelfRating } from "@/engine/prior";
import { sectionEstimate, superscore, totalEstimate } from "@/engine/score";

export async function getSkillSummary(userId: string) {
  const [states, byDomain] = await Promise.all([
    db.select().from(skillState).where(eq(skillState.userId, userId)),
    db.select({ skillId: attempts.skillId, n: sql<number>`count(*)::int` }).from(attempts)
      .where(eq(attempts.userId, userId)).groupBy(attempts.skillId),
  ]);
  const domainsWithEvidence = new Set(byDomain.map((r) => SKILL_BY_ID[r.skillId]?.domain));
  const skills = SKILLS.map((s) => {
    const st = states.find((x) => x.skillId === s.id);
    const theta = st?.theta ?? 0, n = st?.n ?? 0;
    const m = masteryPct(theta);
    return {
      ...s, theta, n, mastery: m,
      status: status(theta, domainsWithEvidence.has(s.domain)) as Status,
      selfRating: (st?.selfRating ?? null) as SelfRating | null,
      calibration: calibration((st?.selfRating ?? null) as SelfRating | null, m, n),
      accuracy: n ? Math.round((100 * (st?.nCorrect ?? 0)) / n) : null,
      avgMs: n ? Math.round((st?.totalTimeMs ?? 0) / n) : null,
      pace: n ? pace((st?.totalTimeMs ?? 0) / n, s.section) : null,
      lastPracticedAt: st?.lastPracticedAt ?? null,
    };
  });
  const rw = sectionEstimate(states, "rw"), math = sectionEstimate(states, "math");
  return { skills, estimate: { rw, math, total: totalEstimate(rw, math) } };
}

export type SkillSummary = Awaited<ReturnType<typeof getSkillSummary>>["skills"][number];

/** Everything a skill page shows beyond getSkillSummary (spec 03 §12, 04 §4). */
export async function getSkillDetail(userId: string, skillId: string) {
  const mine = and(eq(attempts.userId, userId), eq(attempts.skillId, skillId));
  const [history, byDiff, byType, byTag, missed, [lesson]] = await Promise.all([
    db.select({ correct: attempts.correct, thetaAfter: attempts.thetaAfter }).from(attempts)
      .where(mine).orderBy(desc(attempts.createdAt)).limit(60),
    db.select({ d: questions.difficulty, n: sql<number>`count(*)::int`, c: sql<number>`count(*) filter (where ${attempts.correct})::int` })
      .from(attempts).innerJoin(questions, eq(questions.id, attempts.questionId)).where(mine).groupBy(questions.difficulty),
    db.select({ type: attempts.mistakeType, n: sql<number>`count(*)::int` }).from(attempts)
      .where(and(mine, eq(attempts.correct, false))).groupBy(attempts.mistakeType),
    db.select({ tag: sql<string>`t.tag`, n: sql<number>`count(*)::int` })
      .from(attempts).innerJoin(questions, eq(questions.id, attempts.questionId))
      .innerJoin(sql`jsonb_array_elements_text(${questions.tags}) as t(tag)`, sql`true`)
      .where(and(mine, eq(attempts.correct, false))).groupBy(sql`t.tag`).orderBy(sql`count(*) desc`),
    db.selectDistinctOn([attempts.questionId], { id: attempts.questionId, stem: sql<string>`coalesce(${questions.passageMd}, ${questions.stemMd})`, at: attempts.createdAt, dueAt: reviewItems.dueAt })
      .from(attempts).innerJoin(questions, eq(questions.id, attempts.questionId))
      .leftJoin(reviewItems, and(eq(reviewItems.userId, userId), eq(reviewItems.questionId, attempts.questionId)))
      .where(and(mine, eq(attempts.correct, false))).orderBy(attempts.questionId, desc(attempts.createdAt)),
    db.select().from(lessonProgress).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.skillId, skillId))),
  ]);
  const handled = byDiff.filter((r) => r.n >= 3 && r.c / r.n >= 0.6).map((r) => r.d);
  return {
    masteryHistory: history.map((h) => masteryPct(h.thetaAfter)).reverse(),
    trend: trend(history.map((h) => h.correct)),
    highestHandled: handled.length ? Math.max(...handled) : null,
    mistakesByType: byType.filter((r) => r.type),
    mistakesByTag: byTag,
    missed: missed.sort((a, b) => +b.at - +a.at),
    lessonDone: !!lesson,
  };
}

export async function getProgress(userId: string, timezone: string) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const mine30 = and(eq(attempts.userId, userId), gte(attempts.createdAt, since));
  const [snapshots, official, byType, byConfidence, daily] = await Promise.all([
    db.select().from(scoreSnapshots).where(eq(scoreSnapshots.userId, userId)).orderBy(scoreSnapshots.takenAt),
    db.select().from(satAttempts).where(eq(satAttempts.userId, userId)).orderBy(satAttempts.takenOn),
    db.select({ type: attempts.mistakeType, n: sql<number>`count(*)::int` }).from(attempts)
      .where(and(mine30, eq(attempts.correct, false))).groupBy(attempts.mistakeType),
    db.select({ confidence: attempts.confidence, n: sql<number>`count(*)::int`, c: sql<number>`count(*) filter (where ${attempts.correct})::int` })
      .from(attempts).where(and(mine30, isNotNull(attempts.confidence))).groupBy(attempts.confidence),
    db.select({
      day: sql<string>`to_char(${attempts.createdAt} at time zone ${timezone}, 'YYYY-MM-DD')`,
      n: sql<number>`count(*)::int`, ms: sql<number>`sum(${attempts.timeMs})::bigint`,
    }).from(attempts).where(mine30).groupBy(sql`1`).orderBy(sql`1`),
  ]);
  return {
    snapshots, official,
    superscore: superscore(official),
    mistakesByType: byType.filter((r) => r.type),
    calibration: byConfidence.map((r) => ({ confidence: r.confidence!, n: r.n, accuracy: Math.round((100 * r.c) / r.n) })),
    daily: daily.map((d) => ({ day: d.day, n: d.n, minutes: Math.round(Number(d.ms) / 60000) })),
  };
}
