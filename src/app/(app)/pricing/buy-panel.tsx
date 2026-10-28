"use client";
import { useState } from "react";
import { Check, CreditCard, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, type PaidTier, type Tier } from "@/lib/tiers";
import { PayPalButtons } from "./paypal-buttons";

export type BuyOption = { billing: string; label: string; note: string; prices: Record<PaidTier, number>; days: number };
const money = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 ? 2 : 0 });
const FEATURES: Record<PaidTier, string[]> = {
  plus: ["Question bank, Smart Practice and lessons", "Access to all 20 practice tests", "Upgraded question bank", "50 fresh AI question remixes each month"],
  pro: ["Everything included in Plus", "Unlimited AI question remixes", "Make questions easier, same-level or harder", "Change the numbers for fresh math practice"],
};

/** A shared duration keeps both prices comparable; checkout only loads for the chosen plan. */
export function BuyPanel({ current, clientId, options }: { current: Tier; clientId: string | null; options: BuyOption[] }) {
  const [billing, setBilling] = useState(options[0]!.billing);
  const [selected, setSelected] = useState<PaidTier | null>(null);
  const option = options.find((o) => o.billing === billing) ?? options[0]!;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="text-xl font-semibold">Choose your upgrade</h2><p className="mt-1 text-sm text-muted-foreground">More practice, on your timeline.</p></div>
        <div className="flex w-full flex-col gap-1.5 sm:w-auto">
          <label htmlFor="upgrade-duration" className="text-xs font-medium text-muted-foreground">Access duration</label>
          <select id="upgrade-duration" value={billing} onChange={(e) => { setBilling(e.target.value); setSelected(null); }} className="min-h-11 max-w-full rounded-lg border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring">
            {options.map((o) => <option key={o.billing} value={o.billing}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">{option.note}</p>
      <div className="grid gap-5 md:grid-cols-2">
        {(["plus", "pro"] as const).map((tier) => {
          const isCurrent = current === tier;
          const action = isCurrent ? `Extend ${PLANS[tier].name}` : current === "pro" ? "Add Plus for later" : `Upgrade to ${PLANS[tier].name}`;
          return (
            <section key={tier} aria-label={`${PLANS[tier].name} plan`} className={`relative flex flex-col rounded-2xl border bg-card p-6 sm:p-7 ${tier === "pro" ? "border-foreground shadow-sm" : ""} ${selected === tier ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xl font-semibold">OpenPrep {PLANS[tier].name}</h3><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{isCurrent ? "Current plan" : tier === "pro" ? "Most complete" : "More practice"}</span></div>
              <p className="mt-2 text-sm text-muted-foreground">{tier === "plus" ? "Build confidence with more ways to practice." : "Keep going with unlimited AI remixing."}</p>
              <p className="mt-6 text-4xl font-semibold tracking-tight">{money(option.prices[tier])}<span className="ml-2 text-sm font-normal tracking-normal text-muted-foreground">/ {option.days} days</span></p>
              <p className="mt-2 text-xs text-muted-foreground">One payment. No automatic renewal.</p>
              <ul className="my-6 flex flex-1 flex-col gap-3 text-sm">{FEATURES[tier].map((text) => <li key={text} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0" />{text}</li>)}</ul>
              {current === "plus" && tier === "pro" && <p className="mb-4 text-xs text-muted-foreground">Pro starts now. Your remaining Plus days resume afterwards.</p>}
              {current === "pro" && tier === "plus" && <p className="mb-4 text-xs text-muted-foreground">These Plus days start after your Pro access ends.</p>}
              <Button size="lg" variant={tier === "pro" ? "default" : "outline"} className="min-h-11 w-full" disabled={!clientId} aria-expanded={selected === tier} aria-controls={`checkout-${tier}`} onClick={() => setSelected(selected === tier ? null : tier)}><Sparkles className="size-4" />{clientId ? action : "Payments coming soon"}</Button>
              {selected === tier && clientId && <div id={`checkout-${tier}`} className="mt-5 rounded-xl border bg-muted/30 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium"><CreditCard className="size-4" />Complete your upgrade</div>
                <p className="mb-4 text-xs text-muted-foreground">{PLANS[tier].name} · {option.days} days · {money(option.prices[tier])} total</p>
                <PayPalButtons key={`${tier}-${billing}`} tier={tier} billing={billing} clientId={clientId} />
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><LockKeyhole className="size-3" />Secure checkout by PayPal</p>
              </div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
