import "server-only";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { membershipPurchases, paypalEvents } from "@/db/schema";
import { quote, type Billing } from "@/lib/membership";
import { PLANS, type PaidTier } from "@/lib/tiers";
import { grantPurchase, revokePurchase } from "./membership";

/** One-time PayPal payments (Orders API). Each payment buys days of Plus or Pro; nothing renews by itself. */
const base = () => (process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");
export const paypalConfigured = () => !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

/** A message that is safe to show the student. */
export class CheckoutError extends Error {}

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

type Money = { currency_code?: string; value?: string };
type Order = {
  id: string; status: string;
  purchase_units?: { custom_id?: string; payments?: { captures?: { id?: string; status?: string; amount?: Money }[] } }[];
};
const cents = (m?: Money) => (m?.currency_code === "USD" && m.value ? Math.round(Number(m.value) * 100) : NaN);

/** Creates the PayPal order. The price comes from the student's account here, never from the browser. Returns the order id for the buttons. */
export async function createOrder(userId: string, tier: PaidTier, billing: Billing, exam: string | null, now = new Date()) {
  const q = quote(tier, billing, exam, now);
  if (!q) throw new CheckoutError("That SAT date has passed. Pick another option.");
  const [recent] = await db.select({ n: count() }).from(membershipPurchases)
    .where(and(eq(membershipPurchases.userId, userId), eq(membershipPurchases.status, "created"), gte(membershipPurchases.createdAt, new Date(now.getTime() - 3_600_000))));
  if (recent!.n >= 10) throw new CheckoutError("Too many unfinished payments. Please wait a little and try again.");
  const order = await call<Order>("/v2/checkout/orders", {
    method: "POST",
    body: {
      intent: "CAPTURE",
      purchase_units: [{ custom_id: userId, description: `OpenPrep ${PLANS[tier].name}, ${q.days} days`, amount: { currency_code: "USD", value: (q.cents / 100).toFixed(2) } }],
      application_context: { brand_name: "OpenPrep", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING" },
    },
  });
  await db.insert(membershipPurchases).values({ userId, tier, billing, days: q.days, amountCents: q.cents, paypalOrderId: order.id });
  return order.id;
}

/** Grants the days only when PayPal reports the capture completed for exactly the amount we asked for, on this student's order. */
async function settle(purchaseId: string, order: Order) {
  const [p] = await db.select().from(membershipPurchases).where(eq(membershipPurchases.id, purchaseId));
  if (!p) return false;
  if (p.status === "completed") return true;
  const unit = order.purchase_units?.[0], capture = unit?.payments?.captures?.[0];
  if (order.status !== "COMPLETED" || capture?.status !== "COMPLETED" || unit?.custom_id !== p.userId || cents(capture.amount) !== p.amountCents) return false;
  await grantPurchase(p.id);
  return true;
}

/** Captures an approved order (or finds it already captured) and grants the days. Called when the student returns and again from the webhook. */
export async function captureOrder(orderId: string, userId?: string) {
  const [p] = await db.select().from(membershipPurchases).where(eq(membershipPurchases.paypalOrderId, orderId));
  if (!p || (userId && p.userId !== userId)) return false;
  if (p.status === "completed") return true;
  let order: Order;
  try { order = await call<Order>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", body: {} }); }
  catch { order = await call<Order>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`); } // already captured, or not approved yet
  return settle(p.id, order);
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

type Event = {
  id?: string; event_type?: string;
  resource?: { id?: string; amount?: Money; supplementary_data?: { related_ids?: { order_id?: string } } };
};
const RELEVANT = new Set(["CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED", "PAYMENT.CAPTURE.DENIED"]);

/** The webhook is the safety net: it grants days if the student closed the tab after paying, and takes them back on a refund or chargeback. */
export async function applyEvent(event: Event) {
  if (!event.id || !event.event_type || !RELEVANT.has(event.event_type)) return;
  const [seen] = await db.select({ id: paypalEvents.id }).from(paypalEvents).where(eq(paypalEvents.id, event.id));
  if (seen) return;
  const type = event.event_type;
  const orderId = type === "CHECKOUT.ORDER.APPROVED" ? event.resource?.id : event.resource?.supplementary_data?.related_ids?.order_id;
  if (orderId) {
    const [p] = await db.select().from(membershipPurchases).where(eq(membershipPurchases.paypalOrderId, orderId));
    if (p) {
      if (type === "CHECKOUT.ORDER.APPROVED" || type === "PAYMENT.CAPTURE.COMPLETED") await captureOrder(orderId);
      // A partial refund leaves the days alone; only a full refund, a chargeback or a denied capture takes them back.
      else if (type !== "PAYMENT.CAPTURE.REFUNDED" || cents(event.resource?.amount) >= p.amountCents) await revokePurchase(p.id);
    }
  }
  await db.insert(paypalEvents).values({ id: event.id }).onConflictDoNothing();
}
