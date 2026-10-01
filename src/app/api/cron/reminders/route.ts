import { timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/server/push";

export const maxDuration = 60;

// Called hourly by Supabase pg_cron (pg_net) with `Authorization: Bearer $CRON_SECRET`.
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  return Response.json(await sendDueReminders());
}
