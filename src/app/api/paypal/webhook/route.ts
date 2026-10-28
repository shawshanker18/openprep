import { NextResponse } from "next/server";
import { applyEvent, verifyWebhook } from "@/server/paypal";

export const dynamic = "force-dynamic";

/** PayPal calls this when a subscription is activated, cancelled, suspended, expires or is paid. The signature is verified with PayPal first. */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 100_000) return new NextResponse("Too large", { status: 413 });
  let event: unknown;
  try { event = JSON.parse(text); } catch { return new NextResponse("Bad request", { status: 400 }); }
  try {
    if (!(await verifyWebhook(request.headers, event))) return new NextResponse("Invalid signature", { status: 401 });
    await applyEvent(event as Parameters<typeof applyEvent>[0]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    // A 5xx makes PayPal retry later, which is what we want for a transient failure.
    console.error("PayPal webhook failed", e instanceof Error ? e.message : e);
    return new NextResponse("Error", { status: 500 });
  }
}
