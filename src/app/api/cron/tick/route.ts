import { timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/server/push";
import { sweepTests } from "@/server/tests";

export const maxDuration = 60;

// Called every 5 minutes by Supabase pg_cron (pg_net) with `Authorization: Bearer $CRON_SECRET`.
// The server-side timer: closes test modules whose time ran out, then sends any due study reminders.
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  const tests = await sweepTests();
  const reminders = await sendDueReminders();
  return Response.json({ tests, reminders });
}
