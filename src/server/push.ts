// Web push reminders: device subscriptions + the sender called by the /api/cron/tick job.
import "server-only";
import webpush from "web-push";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { membershipBlocks, membershipReminders, pushSubscriptions } from "@/db/schema";

const MAX_DEVICES = 10;

// Only real browser push services: the endpoint is a URL our server POSTs to, so anything else would be SSRF.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.push\.apple\.com$/, /\.notify\.windows\.com$/];
export const PushSubscriptionInput = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000).refine((u) => PUSH_HOSTS.some((h) => h.test(new URL(u).hostname)), "push service"),
  keys: z.object({ p256dh: z.string().regex(/^[A-Za-z0-9_-]{80,100}$/), auth: z.string().regex(/^[A-Za-z0-9_-]{16,32}$/) }),
});

let configured = false;
function configure() {
  if (configured) return true;
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject } = process.env;
  if (!pub || !priv || !subject) return false;
  webpush.setVapidDetails(subject, pub, priv);
  return (configured = true);
}

export async function saveSubscription(userId: string, sub: z.infer<typeof PushSubscriptionInput>) {
  await db.transaction(async (tx) => {
    // A device's endpoint belongs to whoever subscribed last on it (shared computer → new account takes over).
    await tx.insert(pushSubscriptions).values({ endpoint: sub.endpoint, userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, lastSentOn: null } });
    await tx.execute(sql`delete from push_subscriptions where user_id = ${userId} and endpoint not in (
      select endpoint from push_subscriptions where user_id = ${userId} order by created_at desc limit ${MAX_DEVICES})`);
  });
}

export async function removeSubscription(userId: string, endpoint: string) {
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

type Target = { endpoint: string; p256dh: string; auth: string };
type Payload = { title: string; body: string; url: string };

/** Sends to each target; drops subscriptions the push service says are gone. Returns the endpoints that succeeded. */
async function sendAll(targets: (Target & { payload: Payload })[]) {
  if (!configure()) return [];
  const ok: string[] = [], gone: string[] = [];
  for (let i = 0; i < targets.length; i += 50) {
    await Promise.all(targets.slice(i, i + 50).map(async (t) => {
      try {
        await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, JSON.stringify(t.payload), { TTL: 3600, timeout: 10_000 });
        ok.push(t.endpoint);
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(t.endpoint);
      }
    }));
  }
  if (gone.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, gone));
  return ok;
}

export async function sendTest(userId: string) {
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  const ok = await sendAll(subs.map((s) => ({ ...s, payload: { title: "OpenPrep", body: "Reminders are on. See you at practice time!", url: "/dashboard" } })));
  return { devices: subs.length, delivered: ok.length };
}

/**
 * Hourly: devices whose owner's local hour is their reminder hour, who haven't answered anything today (local),
 * and haven't been reminded today. At most one reminder per device per day.
 */
export async function sendDueReminders() {
  // The cron tick calls this every five minutes. The full query reads pg_timezone_names (~140 ms), so skip it
  // while no device could possibly be due.
  const [any] = await db.execute<{ found: boolean }>(sql`
    select exists(select 1 from push_subscriptions s join profiles p on p.id = s.user_id where p.reminder_hour is not null) as found`);
  if (!any?.found) return { candidates: 0, sent: 0 };
  // Time zones are validated when they are saved, so the cheap query is used first. Only if the database rejects a
  // stored zone name does it fall back to the slow query that filters through pg_timezone_names (~140 ms).
  type Row = Target & { local_day: string; minutes: number; days_left: number | null };
  const query = (guard: boolean) => db.execute<Row>(sql`
    ${guard ? sql`with tz as (select name from pg_timezone_names),` : sql`with`}
    due as (
      select s.endpoint, s.p256dh, s.auth, s.user_id, s.last_sent_on, p.minutes_per_day as minutes,
        (now() at time zone p.timezone)::date as local_day,
        p.test_date - (now() at time zone p.timezone)::date as days_left,
        p.timezone
      from push_subscriptions s
      join profiles p on p.id = s.user_id
      ${guard ? sql`join tz on tz.name = p.timezone` : sql``}
      where p.reminder_hour = extract(hour from now() at time zone p.timezone)
        and p.onboarding_step in ('done', 'diagnostic_skipped')
    )
    select endpoint, p256dh, auth, local_day::text, minutes, days_left from due
    where last_sent_on is distinct from local_day
      and not exists (select 1 from attempts a where a.user_id = due.user_id
        and a.created_at >= (local_day::timestamp at time zone due.timezone))
    limit 5000`);
  const rows = await query(false).catch(() => query(true));
  const targets = rows.map((r) => ({
    ...r,
    payload: {
      title: "Time for SAT practice",
      body: r.days_left != null && r.days_left >= 0 && r.days_left <= 60
        ? `${r.days_left} day${r.days_left === 1 ? "" : "s"} to your SAT. Pick up where you left off.`
        : "Pick up where you left off.",
      url: "/dashboard",
    },
  }));
  const ok = new Set(await sendAll(targets));
  // Mark per local day (rows can span days across timezones).
  const byDay = new Map<string, string[]>();
  for (const t of targets) if (ok.has(t.endpoint)) byDay.set(t.local_day, [...(byDay.get(t.local_day) ?? []), t.endpoint]);
  for (const [day, eps] of byDay) await db.update(pushSubscriptions).set({ lastSentOn: day }).where(inArray(pushSubscriptions.endpoint, eps));
  return { candidates: targets.length, sent: ok.size };
}

/** Push to every device of a student whose paid time ends within 3 days. Once per end date, and only for students who have a device. */
export async function sendExpiryReminders(now = new Date()) {
  if (!configure()) return { sent: 0 };
  const last = sql<Date>`max(${membershipBlocks.endsAt})`;
  const ending = await db.select({ userId: membershipBlocks.userId, endsAt: last }).from(membershipBlocks).groupBy(membershipBlocks.userId)
    .having(sql`${last} > ${now} and ${last} <= ${new Date(now.getTime() + 3 * 86_400_000)}`);
  let sent = 0;
  for (const r of ending) {
    const endsAt = new Date(r.endsAt);
    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, r.userId));
    if (!subs.length) continue;
    const fresh = await db.insert(membershipReminders).values({ userId: r.userId, endsAt }).onConflictDoNothing().returning({ u: membershipReminders.userId });
    if (!fresh.length) continue;
    const [b] = await db.select({ tier: membershipBlocks.tier }).from(membershipBlocks).where(and(eq(membershipBlocks.userId, r.userId), eq(membershipBlocks.endsAt, endsAt)));
    const days = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000) - 1);
    const ok = await sendAll(subs.map((s) => ({ ...s, payload: {
      title: "Your OpenPrep plan ends soon",
      body: `Your ${b?.tier === "pro" ? "Pro" : "Plus"} plan ends ${days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}. Add more time to keep your extras.`,
      url: "/pricing",
    } })));
    sent += ok.length;
  }
  return { sent };
}
