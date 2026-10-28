import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paypalEvents, subscriptions } from "@/db/schema";
import { isPaidTier, type PaidTier } from "@/lib/tiers";

/** PayPal Subscriptions. The two billing plans ($7 and $15 a month) are created once in the PayPal dashboard. */
const base = () => (process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");
export const paypalConfigured = () =>
  !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_PLAN_PLUS && process.env.PAYPAL_PLAN_PRO);
const planId = (tier: PaidTier) => (tier === "plus" ? process.env.PAYPAL_PLAN_PLUS : process.env.PAYPAL_PLAN_PRO)!;
const tierOfPlan = (plan: string | undefined): PaidTier | null =>
  plan && plan === process.env.PAYPAL_PLAN_PLUS ? "plus" : plan && plan === process.env.PAYPAL_PLAN_PRO ? "pro" : null;

async function token() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const r = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials", signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`PayPal auth failed (${r.status})`);
  return (await r.json() as { access_token: string }).access_token;
}

async function call<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(`${base()}${path}`, {
    method: init.method ?? "GET", signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!r.ok) throw new Error(`PayPal ${init.method ?? "GET"} ${path} failed (${r.status})`);
  return (r.status === 204 ? undefined : await r.json()) as T;
}

type PayPalSubscription = {
  id: string; status: string; plan_id: string; custom_id?: string;
  billing_info?: { next_billing_time?: string; last_payment?: { time?: string } };
  links?: { rel: string; href: string }[];
};

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Starts checkout: records a pending subscription and returns its id for the PayPal buttons on our own pricing page. */
export async function startCheckout(userId: string, tier: PaidTier) {
  const sub = await call<PayPalSubscription>("/v1/billing/subscriptions", {
    method: "POST",
    body: {
      plan_id: planId(tier), custom_id: userId,
      application_context: {
        brand_name: "OpenPrep", user_action: "SUBSCRIBE_NOW", shipping_preference: "NO_SHIPPING",
        return_url: `${siteUrl()}/billing/return`, cancel_url: `${siteUrl()}/pricing`,
      },
    },
  });
  await db.insert(subscriptions).values({ userId, tier, status: "pending", paypalSubscriptionId: sub.id })
    .onConflictDoUpdate({ target: subscriptions.userId, set: { tier, status: "pending", paypalSubscriptionId: sub.id, currentPeriodEnd: null, updatedAt: new Date() } });
  return sub.id;
}

const STATUS: Record<string, string> = { ACTIVE: "active", APPROVAL_PENDING: "pending", APPROVED: "pending", SUSPENDED: "suspended", CANCELLED: "cancelled", EXPIRED: "expired" };

/** Copies PayPal's view of one subscription into our table. Tier comes from the PayPal plan, never from the browser. */
export async function syncSubscription(paypalId: string, expectUser?: string) {
  const remote = await call<PayPalSubscription>(`/v1/billing/subscriptions/${encodeURIComponent(paypalId)}`);
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.paypalSubscriptionId, paypalId));
  if (!row || (expectUser && row.userId !== expectUser) || (remote.custom_id && remote.custom_id !== row.userId)) return null;
  const tier = tierOfPlan(remote.plan_id);
  if (!tier) return null;
  const next = remote.billing_info?.next_billing_time;
  const status = STATUS[remote.status] ?? row.status;
  await db.update(subscriptions).set({
    tier, status, updatedAt: new Date(),
    // A cancelled plan keeps its tier until the period already paid for ends.
    currentPeriodEnd: next ? new Date(next) : row.currentPeriodEnd,
  }).where(eq(subscriptions.paypalSubscriptionId, paypalId));
  return { userId: row.userId, tier, status };
}

export async function cancelSubscription(userId: string) {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  if (!row || row.status !== "active" || !isPaidTier(row.tier)) return false;
  await call(`/v1/billing/subscriptions/${encodeURIComponent(row.paypalSubscriptionId)}/cancel`, { method: "POST", body: { reason: "Cancelled by the student" } });
  await syncSubscription(row.paypalSubscriptionId, userId);
  return true;
}

/** True when PayPal itself vouches for this webhook delivery. */
export async function verifyWebhook(headers: Headers, event: unknown) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const h = (n: string) => headers.get(n);
  const out = await call<{ verification_status?: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      auth_algo: h("paypal-auth-algo"), cert_url: h("paypal-cert-url"), transmission_id: h("paypal-transmission-id"),
      transmission_sig: h("paypal-transmission-sig"), transmission_time: h("paypal-transmission-time"), webhook_id: webhookId, webhook_event: event,
    },
  });
  return out.verification_status === "SUCCESS";
}

/** Events that change what a student has paid for. Anything else is acknowledged and ignored. */
const RELEVANT = new Set([
  "BILLING.SUBSCRIPTION.ACTIVATED", "BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.SUSPENDED", "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.UPDATED", "BILLING.SUBSCRIPTION.PAYMENT.FAILED", "PAYMENT.SALE.COMPLETED",
]);

export async function applyEvent(event: { id?: string; event_type?: string; resource?: { id?: string; billing_agreement_id?: string } }) {
  if (!event.id || !event.event_type || !RELEVANT.has(event.event_type)) return;
  // A redelivery of an event already applied does nothing.
  const fresh = await db.insert(paypalEvents).values({ id: event.id }).onConflictDoNothing().returning({ id: paypalEvents.id });
  if (!fresh.length) return;
  const subId = event.event_type === "PAYMENT.SALE.COMPLETED" ? event.resource?.billing_agreement_id : event.resource?.id;
  if (subId) await syncSubscription(subId);
}
