import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, testSessions } from "@/db/schema";
import { buildActivity, type DayRow } from "@/engine/activity";

const WEEKS = 13;

/** The student's activity heatmap: questions answered, minutes spent and tests finished per local day. Only their own rows. */
export async function getActivity(userId: string, timezone: string, weeks = WEEKS) {
  const since = new Date(Date.now() - (weeks * 7 + 7) * 86_400_000);
  const localDay = (col: unknown) => sql<string>`to_char(${col} at time zone ${timezone}, 'YYYY-MM-DD')`;
  const [answered, finished, [now]] = await Promise.all([
    db.select({ day: localDay(attempts.createdAt), n: sql<number>`count(*)::int`, ms: sql<number>`coalesce(sum(${attempts.timeMs}), 0)::bigint` })
      .from(attempts).where(and(eq(attempts.userId, userId), gte(attempts.createdAt, since))).groupBy(sql`1`),
    db.select({ day: localDay(testSessions.completedAt), n: sql<number>`count(*)::int` })
      .from(testSessions).where(and(eq(testSessions.userId, userId), eq(testSessions.status, "completed"), gte(testSessions.completedAt, since))).groupBy(sql`1`),
    db.execute<{ today: string }>(sql`select to_char(now() at time zone ${timezone}, 'YYYY-MM-DD') as today`),
  ]);
  const days = new Map<string, DayRow>();
  const day = (d: string) => days.get(d) ?? days.set(d, { day: d, questions: 0, minutes: 0, tests: 0 }).get(d)!;
  for (const r of answered) Object.assign(day(r.day), { questions: r.n, minutes: Math.round(Number(r.ms) / 60_000) });
  for (const r of finished) day(r.day).tests = r.n;
  return buildActivity([...days.values()], now!.today, weeks);
}
