import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getSubscription } from "@/server/subscription";
import { syncSubscription } from "@/server/paypal";

export const metadata = { title: "Plan" };

/** PayPal sends the student back here after approving. We ask PayPal what happened rather than trusting the URL. */
export default async function BillingReturn() {
  const { userId } = await requireUser();
  const sub = await getSubscription(userId);
  let ok = false;
  if (sub) {
    try { ok = (await syncSubscription(sub.paypalSubscriptionId, userId))?.status === "active"; }
    catch (e) { console.error("PayPal sync failed", e instanceof Error ? e.message : e); }
  }
  // If PayPal is still processing, the webhook activates the plan within moments.
  redirect(ok ? "/settings?plan=active#plan" : "/settings?plan=processing#plan");
}
