"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { getTier } from "@/server/subscription";
import { cancelSubscription, paypalConfigured, startCheckout } from "@/server/paypal";

const Tier = z.enum(["plus", "pro"]);

/** Sends the student to PayPal to approve a monthly plan. The plan is activated only after PayPal confirms it. */
export async function subscribe(form: FormData) {
  const { userId } = await requireUser();
  const tier = Tier.safeParse(form.get("tier"));
  if (!tier.success) redirect("/pricing?error=invalid");
  if (!paypalConfigured()) redirect("/pricing?error=unavailable");
  if ((await getTier(userId)) !== "free") redirect("/settings#plan");
  let approve: string;
  try { approve = await startCheckout(userId, tier.data); }
  catch (e) { console.error("PayPal checkout failed", e instanceof Error ? e.message : e); redirect("/pricing?error=paypal"); }
  redirect(approve);
}

export async function cancelPlan() {
  const { userId } = await requireUser();
  try { await cancelSubscription(userId); }
  catch (e) { console.error("PayPal cancel failed", e instanceof Error ? e.message : e); redirect("/settings?error=cancel#plan"); }
  redirect("/settings#plan");
}
