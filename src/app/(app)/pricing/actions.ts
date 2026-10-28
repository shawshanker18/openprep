"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { getSubscription, getTier } from "@/server/subscription";
import { cancelSubscription, paypalConfigured, startCheckout, syncSubscription } from "@/server/paypal";

const Tier = z.enum(["plus", "pro"]);

/** Called by the PayPal buttons on the pricing page. Returns the new subscription's id; nothing is charged until the student approves. */
export async function startSubscription(tierInput: string): Promise<{ id: string } | { error: string }> {
  const { userId } = await requireUser();
  const tier = Tier.safeParse(tierInput);
  if (!tier.success) return { error: "That plan isn't available." };
  if (!paypalConfigured()) return { error: "Payments aren't switched on yet. Please try again soon." };
  if ((await getTier(userId)) !== "free") return { error: "You already have a paid plan." };
  try { return { id: await startCheckout(userId, tier.data) }; }
  catch (e) { console.error("PayPal checkout failed", e instanceof Error ? e.message : e); return { error: "We couldn't reach PayPal. Nothing was charged. Please try again." }; }
}

/** After the student approves: ask PayPal what happened rather than trusting the browser. The webhook finishes the job if PayPal is slow. */
export async function confirmSubscription(subscriptionId: string): Promise<{ active: boolean }> {
  const { userId } = await requireUser();
  const sub = await getSubscription(userId);
  if (!sub || sub.paypalSubscriptionId !== subscriptionId) return { active: false };
  try { return { active: (await syncSubscription(subscriptionId, userId))?.status === "active" }; }
  catch (e) { console.error("PayPal sync failed", e instanceof Error ? e.message : e); return { active: false }; }
}

export async function cancelPlan() {
  const { userId } = await requireUser();
  try { await cancelSubscription(userId); }
  catch (e) { console.error("PayPal cancel failed", e instanceof Error ? e.message : e); redirect("/settings?error=cancel#plan"); }
  redirect("/settings#plan");
}
