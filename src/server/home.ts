// The dashboard's "where you left off" and lifetime numbers, straight from the student's own history.
import "server-only";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, testSessions } from "@/db/schema";
import { scratchProgress } from "./scratch";

export async function homeData(userId: string) {
  const [[openTest], [lastPractice], course, [totals]] = await Promise.all([
    db.select({ id: testSessions.id, kind: testSessions.kind, startedAt: testSessions.startedAt }).from(testSessions)
      .where(and(eq(testSessions.userId, userId), eq(testSessions.status, "in_progress"), ne(testSessions.kind, "diagnostic")))
      .orderBy(desc(testSessions.startedAt)).limit(1),
    db.select({ skillId: attempts.skillId, at: attempts.createdAt }).from(attempts)
      .where(and(eq(attempts.userId, userId), inArray(attempts.context, ["practice", "review"])))
      .orderBy(desc(attempts.createdAt)).limit(1),
    scratchProgress(userId),
    db.select({
      answered: sql<number>`count(*)::int`,
      correct: sql<number>`coalesce(sum(case when ${attempts.correct} then 1 else 0 end), 0)::int`,
      minutes: sql<number>`coalesce(round(sum(${attempts.timeMs}) / 60000.0), 0)::int`,
    }).from(attempts).where(eq(attempts.userId, userId)),
  ]);
  const done = course.steps.filter((s) => s.status === "done").length;
  return {
    openTest: openTest ?? null,
    lastPractice: lastPractice ?? null,
    course: { next: course.next, done, total: course.steps.length },
    totals: { answered: totals!.answered, accuracy: totals!.answered ? Math.round((100 * totals!.correct) / totals!.answered) : null, minutes: totals!.minutes },
  };
}
