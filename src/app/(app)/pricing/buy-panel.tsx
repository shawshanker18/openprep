"use client";
import { useState } from "react";
import { Check, CreditCard, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, type PaidTier, type Tier } from "@/lib/tiers";
import { PayPalButtons } from "./paypal-buttons";

export type BuyOption = { billing: string; label: string; note: string; prices: Record<PaidTier, number>; days: number };
const money = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 ? 2 : 0 });
/** Quarterly is compared with three monthly passes; other durations show no discount. */
const monthlyFor = (o: BuyOption, options: BuyOption[]) => (o.billing === "quarterly" ? options.find((x) => x.billing === "monthly") : undefined);
const savings = (o: BuyOption, options: BuyOption[]) => {
  const m = monthlyFor(o, options);
  return m ? Math.round((1 - o.prices.plus / (m.prices.plus * 3)) * 100) : 0;
};
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
    <div className="flex flex-col gap-4 sm:gap-5">
      <div><h2 className="text-xl font-semibold">Choose your upgrade</h2><p className="mt-1 text-sm text-muted-foreground">Pick how long you need access. Longer passes cost less per day.</p></div>
      <div role="radiogroup" aria-label="Access duration" className="grid grid-cols-1 gap-3 sm:grid-cols-2 @3xl:grid-cols-4">
        {options.map((o) => {
          const [title, sub] = o.label.split(" · ");
          const save = savings(o, options);
          const on = o.billing === billing;
          return (
            <button key={o.billing} type="button" role="radio" aria-checked={on} onClick={() => { setBilling(o.billing); setSelected(null); }} className={`relative flex min-h-[4.5rem] flex-col justify-center rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring ${on ? "border-foreground ring-1 ring-foreground" : ""}`}>
              <span className="flex items-center justify-between gap-2 text-sm font-semibold">{title}{save > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Save {save}%</span>}</span>
              <span className="mt-0.5 text-xs text-muted-foreground">{sub ? `${sub} · ` : ""}{o.days} days · {money(o.prices.plus)}+</span>
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">{option.note}</p>
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @2xl:gap-6">
        {(["plus", "pro"] as const).map((tier) => {
          const isCurrent = current === tier;
          const m = monthlyFor(option, options);
          const was = m ? m.prices[tier] * 3 : null;
          const action = isCurrent ? `Extend ${PLANS[tier].name}` : current === "pro" ? "Add Plus for later" : `Upgrade to ${PLANS[tier].name}`;
          return (
            <section key={tier} aria-label={`${PLANS[tier].name} plan`} className={`relative flex flex-col rounded-xl border bg-card p-5 @lg:p-6 ${tier === "pro" ? "border-foreground shadow-sm" : ""} ${selected === tier ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"><h3 className="text-lg font-semibold sm:text-xl">OpenPrep {PLANS[tier].name}</h3><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{isCurrent ? "Current plan" : tier === "pro" ? "Most complete" : "More practice"}</span></div>
              <p className="mt-2 text-sm text-muted-foreground">{tier === "plus" ? "Build confidence with more ways to practice." : "Keep going with unlimited AI remixing."}</p>
              <p className="mt-5 flex flex-wrap items-baseline gap-x-2 text-3xl font-semibold tracking-tight sm:text-4xl">{money(option.prices[tier])}<span className="text-sm font-normal tracking-normal text-muted-foreground">/ {option.days} days</span>{was && <span className="text-base font-normal tracking-normal text-muted-foreground line-through" aria-label={`Original price ${money(was)}`}>{money(was)}</span>}{was && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium tracking-normal text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{Math.round((1 - option.prices[tier] / was) * 100)}% off</span>}</p>
              <p className="mt-2 text-xs text-muted-foreground">One payment. No automatic renewal.</p>
              <ul className="my-5 flex flex-1 flex-col gap-2.5 text-sm">{FEATURES[tier].map((text) => <li key={text} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0" />{text}</li>)}</ul>
              {current === "plus" && tier === "pro" && <p className="mb-4 text-xs text-muted-foreground">Pro starts now. Your remaining Plus days resume afterwards.</p>}
              {current === "pro" && tier === "plus" && <p className="mb-4 text-xs text-muted-foreground">These Plus days start after your Pro access ends.</p>}
              <Button size="lg" variant={tier === "pro" ? "default" : "outline"} className="min-h-11 w-full" disabled={!clientId} aria-expanded={selected === tier} aria-controls={`checkout-${tier}`} onClick={() => setSelected(selected === tier ? null : tier)}><Sparkles className="size-4" />{clientId ? action : "Payments coming soon"}</Button>
              {selected === tier && clientId && <div id={`checkout-${tier}`} className="mt-4 rounded-lg border bg-muted/30 p-3 sm:p-4">
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
