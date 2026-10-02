// Sign-up cap (3 new accounts per IP per day). Our server issues a ticket before every sign-in attempt; Supabase's
// before-user-created hook (public.hook_signup_cap, drizzle/0008) only creates an account that holds a fresh ticket,
// and counts accounts against the ticket's IP. Existing users never need one: the hook only runs for new accounts.
import "server-only";
import { headers } from "next/headers";
import { and, count, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { signupTickets } from "@/db/schema";

const MAX_TICKETS_PER_HOUR = 30; // per IP: sign-in attempts, so the table can't be flooded

/** The requester's IP as Vercel saw it (Vercel overwrites X-Forwarded-For, so a client can't fake it). */
export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || "unknown";
}

/** Lets Supabase create an account for this email in the next 30 minutes, if it turns out to be new. */
export async function issueSignupTicket(email: string, ip: string, now = new Date()) {
  const [{ n }] = (await db.select({ n: count() }).from(signupTickets)
    .where(and(eq(signupTickets.ip, ip), gte(signupTickets.createdAt, new Date(now.getTime() - 3_600_000))))) as [{ n: number }];
  if (n >= MAX_TICKETS_PER_HOUR) return false;
  await db.insert(signupTickets).values({ email: email.toLowerCase(), ip, createdAt: now });
  return true;
}

/** Run by the cron tick: tickets only matter for a day. */
export async function deleteOldSignupTickets(now = new Date()) {
  await db.delete(signupTickets).where(lt(signupTickets.createdAt, new Date(now.getTime() - 2 * 86_400_000)));
}

/** The hook's refusal messages, passed through to the sign-in screens as they are. */
export const SIGNUP_REFUSALS = ["Too many new accounts from your network today", "Please create your account on the OpenPrep website or app"];
