import { ensureDatabase } from "@/db";

export const dynamic = "force-dynamic";

// Pinged every minute by Supabase pg_cron so a server instance and its database connection stay warm.
// Public on purpose: it does no work beyond opening a connection and returns nothing about the data.
export async function GET() {
  try { await ensureDatabase(); return new Response("ok", { headers: { "Cache-Control": "no-store" } }); }
  catch { return new Response("db unavailable", { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
