"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { capturePayment, startPayment } from "./actions";

type Button = { isEligible(): boolean; render(el: HTMLElement): Promise<void>; close(): Promise<void> };
type Sdk = { FUNDING: { CARD: string; PAYPAL: string }; Buttons(options: unknown): Button };
declare global { interface Window { paypal?: Sdk } }

let loading: Promise<Sdk> | null = null;
/** PayPal's script is loaded once per page; the client id decides sandbox or live. */
function loadSdk(clientId: string) {
  loading ??= new Promise<Sdk>((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal);
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=buttons&currency=USD&enable-funding=card&disable-funding=paylater,venmo`;
    s.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("PayPal did not load")));
    s.onerror = () => { loading = null; reject(new Error("PayPal did not load")); };
    document.head.appendChild(s);
  });
  return loading;
}

/** Card and PayPal buttons on our own page. The card button opens a small PayPal window where the student pays as a guest, no PayPal login. */
export function PayPalButtons({ tier, billing, clientId }: { tier: "plus" | "pro"; billing: string; clientId: string }) {
  const router = useRouter();
  const card = useRef<HTMLDivElement>(null), wallet = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const open: Button[] = [];
    loadSdk(clientId).then((sdk) => {
      const make = (fundingSource: string, color: string, el: HTMLDivElement | null) => {
        if (stop || !el) return;
        const button = sdk.Buttons({
          fundingSource, style: { layout: "vertical", shape: "rect", color, label: "pay", height: 44 },
          createOrder: async () => {
            setMessage(null);
            const r = await startPayment(tier, billing);
            if ("error" in r) { setMessage(r.error); throw new Error(r.error); }
            return r.id;
          },
          onApprove: async (data: { orderID?: string }) => {
            const r = await capturePayment(data.orderID ?? "");
            router.push(r.active ? "/settings?plan=active#plan" : "/settings?plan=processing#plan");
          },
          onCancel: () => setMessage(null),
          onError: () => setMessage((m) => m ?? "The payment didn't go through. Nothing was charged. Please try again."),
        });
        if (!button.isEligible()) return;
        open.push(button);
        void button.render(el).catch(() => {});
      };
      make(sdk.FUNDING.CARD, "black", card.current);
      make(sdk.FUNDING.PAYPAL, "gold", wallet.current);
    }).catch(() => setMessage("We couldn't load the payment form. Please refresh and try again."));
    return () => { stop = true; open.forEach((b) => void b.close().catch(() => {})); };
  }, [clientId, tier, billing, router]);

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div ref={card} aria-label="Pay with a debit or credit card" />
      <div ref={wallet} aria-label="Pay with PayPal" />
      {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
    </div>
  );
}
