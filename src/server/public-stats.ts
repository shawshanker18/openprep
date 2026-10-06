import 'server-only';
import { count, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { profiles, attempts, testSessions } from '@/db/schema';
import { memo } from '@/lib/memo';

/** Aggregate counts only; hide until usage is meaningful. Never publish student records. */
export const publicStats = memo(600_000, async () => {
  if (!process.env.DATABASE_URL) return null;
  const [[users], [answered], [tests], [active]] = await Promise.all([
    db.select({n:count()}).from(profiles),
    db.select({n:count()}).from(attempts),
    db.select({n:count()}).from(testSessions).where(eq(testSessions.status,'completed')),
    db.select({n:sql<number>`count(distinct user_id)::int`}).from(sql`(
      select user_id from attempts where created_at >= now()-interval '30 days'
      union select user_id from test_sessions where started_at >= now()-interval '30 days'
    ) activity`),
  ]);
  if (users!.n < 10 || answered!.n < 100) return null;
  return {users:users!.n, answered:answered!.n, tests:tests!.n, active:active!.n};
});
