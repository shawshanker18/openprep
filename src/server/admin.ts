// Admins. Granted only from the backend (`npm run admin -- grant <email>`, or SQL in Supabase): the app's database role
// can read the admins table but not write it (drizzle/0010), so nothing a visitor does can make them an admin.
import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminAudit, admins } from "@/db/schema";
import { getUserId } from "./auth";

/** Is this user an admin? One lookup per request. */
export const isAdmin = cache(async (userId: string | null) => {
  if (!userId) return false;
  const [row] = await db.select({ id: admins.userId }).from(admins).where(eq(admins.userId, userId));
  return !!row;
});

/** For admin pages and actions. Anyone else gets a plain 404: the admin area doesn't admit it exists. */
export async function requireAdmin() {
  const userId = await getUserId();
  if (!userId || !(await isAdmin(userId))) notFound();
  return { adminId: userId };
}

/** Append-only record of what an admin did (the app can add rows, never change or delete them). */
export async function audit(adminId: string, action: string, target: string | null, detail?: Record<string, unknown>) {
  await db.insert(adminAudit).values({ adminId, action, target, detail: detail ?? null });
}

export type Directory = { id: string; email: string | null; createdAt: Date; lastSignInAt: Date | null };

/** Students' emails (auth.users) through the read-only directory function (drizzle/0011). */
export async function userDirectory(search: string | null, limit: number, skip: number): Promise<Directory[]> {
  const rows = await db.execute(sql`select id, email, created_at, last_sign_in_at from public.admin_user_directory(${search}, ${limit}, ${skip})`);
  return (rows as unknown as { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }[])
    .map((r) => ({ id: r.id, email: r.email, createdAt: new Date(r.created_at), lastSignInAt: r.last_sign_in_at ? new Date(r.last_sign_in_at) : null }));
}

export async function userEmails(ids: string[]): Promise<Map<string, Directory>> {
  ids = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!ids.length) return new Map();
  const rows = await db.execute(sql`select id, email, created_at, last_sign_in_at from public.admin_user_emails(${`{${ids.join(",")}}`}::uuid[])`);
  return new Map((rows as unknown as { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }[])
    .map((r) => [r.id, { id: r.id, email: r.email, createdAt: new Date(r.created_at), lastSignInAt: r.last_sign_in_at ? new Date(r.last_sign_in_at) : null }]));
}

/* ───────── data for the admin pages (each page also calls requireAdmin itself) ───────── */
const rowsOf = <T>(r: unknown) => r as T[];

/** Headline numbers: people, activity, and how many requests are waiting. */
export async function overview(now = new Date()) {
  // Raw SQL parameters must be strings here (postgres-js doesn't serialise Dates without a typed column).
  const ago = (days: number) => sql`${new Date(now.getTime() - days * 86_400_000).toISOString()}::timestamptz`;
  const d1 = ago(1), d7 = ago(7), d30 = ago(30);
  const [r] = rowsOf<Record<string, number | null>>(await db.execute(sql`
    select
      (select count(*)::int from profiles) as users,
      (select count(*)::int from profiles where created_at >= ${d1}) as new_1d,
      (select count(*)::int from profiles where created_at >= ${d7}) as new_7d,
      (select count(distinct user_id)::int from attempts where created_at >= ${d1}) as active_1d,
      (select count(distinct user_id)::int from attempts where created_at >= ${d7}) as active_7d,
      (select count(*)::int from attempts where created_at >= ${d1}) as answers_1d,
      (select count(*)::int from attempts where created_at >= ${d7}) as answers_7d,
      (select count(*)::int from test_sessions where started_at >= ${d7}) as tests_started_7d,
      (select count(*)::int from test_sessions where completed_at >= ${d7} and status = 'completed') as tests_done_7d,
      (select count(*)::int from feedback where status in ('new', 'in_progress')) as open_feedback,
      (select count(*)::int from question_reports where status in ('new', 'in_progress')) as open_questions,
      (select count(*)::int from security_reports where status in ('new', 'in_progress')) as open_security,
      (select round(avg(rating)::numeric, 1)::float from feedback where kind = 'review' and rating is not null and created_at >= ${d30}) as rating_30d,
      (select count(*)::int from feedback where kind = 'review' and rating is not null and created_at >= ${d30}) as ratings_30d,
      (select count(*)::int from questions where status = 'active') as questions`));
  return r!;
}

/** Recent events across the site, newest first, `before` a time (for paging). */
export async function activity(beforeDate: Date, limit = 50) {
  const before = sql`${beforeDate.toISOString()}::timestamptz`;
  return rowsOf<{ at: string; kind: string; user_id: string | null; detail: string; ref: string | null }>(await db.execute(sql`
    select * from (
      select created_at as at, 'signup' as kind, id as user_id, 'Joined OpenPrep' as detail, null::text as ref from profiles where created_at < ${before}
      union all
      select started_at, 'test', user_id, 'Started a ' || kind || ' test', id::text from test_sessions where started_at < ${before}
      union all
      select completed_at, 'test', user_id, (case when status = 'completed' then 'Finished a ' else 'Ended a ' end) || kind || ' test', id::text
        from test_sessions where completed_at is not null and completed_at < ${before}
      union all
      select max(created_at), 'practice', user_id,
        'Answered ' || count(*) || ' question' || (case when count(*) = 1 then '' else 's' end) || ' (' || sum(case when correct then 1 else 0 end) || ' right)', null
        from attempts where created_at < ${before} group by user_id, date_trunc('hour', created_at)
      union all
      select created_at, 'feedback', user_id, 'Sent feedback (' || kind || ')', id::text from feedback where created_at < ${before}
      union all
      select created_at, 'report', user_id, 'Reported a question (' || reason || ')', id::text from question_reports where created_at < ${before}
      union all
      select created_at, 'security', null, 'Security report', id::text from security_reports where created_at < ${before}
      union all
      select created_at, 'admin', admin_id, 'Admin: ' || action || coalesce(' ' || target, ''), id::text from admin_audit where created_at < ${before}
    ) e order by at desc limit ${limit}`));
}

/** One student's story: profile, numbers, recent answers, tests, and what they've sent us. */
export async function userDetail(userId: string) {
  const [[profile], [stats], recent, tests, sent, reports, admin] = await Promise.all([
    db.execute(sql`select * from profiles where id = ${userId}`).then(rowsOf<Record<string, unknown>>),
    db.execute(sql`select count(*)::int as answers, sum(case when correct then 1 else 0 end)::int as correct,
        count(*) filter (where created_at >= now() - interval '7 days')::int as answers_7d, max(created_at) as last_active,
        round(avg(time_ms) / 1000.0)::int as avg_seconds from attempts where user_id = ${userId}`).then(rowsOf<Record<string, number | string | null>>),
    db.execute(sql`select created_at, skill_id, context, correct, time_ms from attempts where user_id = ${userId} order by created_at desc limit 25`)
      .then(rowsOf<{ created_at: string; skill_id: string; context: string; correct: boolean; time_ms: number }>),
    db.execute(sql`select id, kind, status, started_at, completed_at from test_sessions where user_id = ${userId} order by started_at desc limit 20`)
      .then(rowsOf<{ id: string; kind: string; status: string; started_at: string; completed_at: string | null }>),
    db.execute(sql`select id, kind, rating, message, status, created_at from feedback where user_id = ${userId} order by created_at desc limit 20`)
      .then(rowsOf<{ id: string; kind: string; rating: number | null; message: string; status: string; created_at: string }>),
    db.execute(sql`select id, reason, note, status, created_at from question_reports where user_id = ${userId} order by created_at desc limit 20`)
      .then(rowsOf<{ id: string; reason: string; note: string | null; status: string; created_at: string }>),
    isAdmin(userId),
  ]);
  return profile ? { profile, stats: stats!, recent, tests, sent, reports, admin } : null;
}

/** Per-user numbers for a page of the user list. */
export async function userStats(ids: string[]) {
  ids = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!ids.length) return new Map<string, { answers: number; last_active: string | null; step: string | null; tests: number }>();
  const list = sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `);
  const rows = rowsOf<{ id: string; answers: number; last_active: string | null; step: string | null; tests: number }>(await db.execute(sql`
    select p.id, p.onboarding_step as step,
      (select count(*)::int from attempts a where a.user_id = p.id) as answers,
      (select max(created_at) from attempts a where a.user_id = p.id) as last_active,
      (select count(*)::int from test_sessions t where t.user_id = p.id) as tests
    from profiles p where p.id in (${list})`));
  return new Map(rows.map((r) => [r.id, r]));
}
