"use server";
import { requireUser } from "@/server/auth";
import { captureOrder, CheckoutError, createOrder, paypalConfigured } from "@/server/paypal";
import { isBilling } from "@/lib/membership";
import { isPaidTier } from "@/lib/tiers";

/** Called by the PayPal buttons. Returns the order id; nothing is charged until the student approves in the PayPal window. */
export async function startPayment(tier: string, billing: string): Promise<{ id: string } | { error: string }> {
  const { userId, profile } = await requireUser();
  if (!isPaidTier(tier) || !isBilling(billing)) return { error: "That option isn't available." };
  if (!paypalConfigured()) return { error: "Payments aren't switched on yet. Please try again soon." };
  try { return { id: await createOrder(userId, tier, billing, profile.testDate) }; }
  catch (e) {
    if (e instanceof CheckoutError) return { error: e.message };
    console.error("PayPal order failed", e instanceof Error ? e.message : e);
    return { error: "We couldn't reach PayPal. Nothing was charged. Please try again." };
  }
}

/** After the student approves: capture the payment and add the days. If PayPal is slow, the webhook finishes the job. */
export async function capturePayment(orderId: string): Promise<{ active: boolean }> {
  const { userId } = await requireUser();
  try { return { active: await captureOrder(orderId, userId) }; }
  catch (e) { console.error("PayPal capture failed", e instanceof Error ? e.message : e); return { active: false }; }
}
