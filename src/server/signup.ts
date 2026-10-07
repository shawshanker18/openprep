// Email reservations prevent unsolicited signup. Verified Google identities use one OAuth flow.
// Short request windows prevent floods without daily account limits on shared networks.
import "server-only";
import { headers } from "next/headers";
import { lt } from "drizzle-orm";
import { db } from "@/db";
import { consumeWindow } from "./delivery";
import { deliveryContext } from "./delivery-context";
import { digest, trustedIp } from "./delivery-identity";
import { DeliveryBlocked } from "./delivery-policy";
import { signupTickets } from "@/db/schema";

const MAX_TICKETS_PER_MINUTE = 300;

/** The requester's IP as Vercel saw it (Vercel overwrites X-Forwarded-For, so a client can't fake it). */
export async function clientIp() {
  const h = await headers();
  return trustedIp(h) ?? digest("unknown-network");
}

/** Lets Supabase create an account for this email in the next 30 minutes, if it turns out to be new. */
export async function issueSignupTicket(email: string, ip: string, now = new Date()) {
  const context=await deliveryContext();
  try {
    await db.transaction(async tx=>{
      await consumeWindow(tx,`signup:ip:${digest(ip)}`,MAX_TICKETS_PER_MINUTE,60_000,1,now.getTime());
      if(context.device) await consumeWindow(tx,`signup:device:${context.device}`,10,60_000,1,now.getTime());
      await tx.insert(signupTickets).values({email:email.toLowerCase(),ip,createdAt:now});
    });
    return true;
  } catch(e) { if(e instanceof DeliveryBlocked) return false; throw e; }

}

/** Run by the cron tick: tickets only matter for a day. */
export async function deleteOldSignupTickets(now = new Date()) {
  await db.delete(signupTickets).where(lt(signupTickets.createdAt, new Date(now.getTime() - 2 * 86_400_000)));
}

/** The hook's refusal messages, passed through to the sign-in screens as they are. */
export const SIGNUP_REFUSALS = ["Please continue with email on the OpenPrep website or app."];
