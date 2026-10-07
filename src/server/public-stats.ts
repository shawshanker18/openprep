import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { memo } from '@/lib/memo';

/**
 * For page renders: the community numbers are decoration, so a slow or hung count must never hold up Dashboard or
 * Progress. Wait briefly; on timeout the page renders without them and the cached promise still finishes for next time.
 */
export async function publicStatsForPage(waitMs = 400) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      publicStats().catch(() => null),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), waitMs); }),
    ]);
  } finally { clearTimeout(timer); }
}

/** Public aggregate counts only, cached per instance for ten minutes. */
export const publicStats = memo(600_000, async () => {
  if (!process.env.DATABASE_URL) return null;
  const [counts] = await db.execute<{users:number; answered:number; tests:number; active:number}>(sql`
    select
      (select count(*)::int from profiles) as users,
      (select count(*)::int from attempts) as answered,
      (select count(*)::int from test_sessions where status='completed') as tests,
      (select count(distinct user_id)::int from (
        select user_id from attempts where created_at >= now()-interval '30 days'
        union all
        select user_id from test_sessions where started_at >= now()-interval '30 days'
      ) activity) as active
  `);
  if (!counts || counts.users < 10 || counts.answered < 100) return null;
  return counts;
});
