import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { getTier } from "@/server/subscription";
import { PLANS, type Tier } from "@/lib/tiers";
import { subscribe } from "./actions";

export const metadata = { title: "Plans" };

const ERRORS: Record<string, string> = {
  invalid: "That plan isn't available.",
  unavailable: "Payments aren't switched on yet. Please try again soon.",
  paypal: "We couldn't reach PayPal. Nothing was charged. Please try again.",
};

// Feature copy lives here so the plans can be tuned without touching the billing code.
const CARDS: { tier: Tier; blurb: string; features: { text: string; has: boolean }[] }[] = [
  { tier: "free", blurb: "Everything you need to start.", features: [
    { text: "Question bank and Smart Practice", has: true }, { text: "6 practice tests", has: true }, { text: "Free lessons", has: true },
    { text: "Upgraded question bank", has: false }, { text: "AI question remix", has: false }] },
  { tier: "plus", blurb: "More tests, harder questions.", features: [
    { text: "Everything in Free", has: true }, { text: "All 20 practice tests", has: true }, { text: "Upgraded bank: hard and official SAT questions", has: true },
    { text: "50 AI remixes a month", has: true }, { text: "Unlimited AI remix", has: false }] },
  { tier: "pro", blurb: "Unlimited remixing.", features: [
    { text: "Everything in Plus", has: true }, { text: "Unlimited AI question remix", has: true }, { text: "Easier, same-level or harder version of any question", has: true }] },
];

export default async function Pricing({ searchParams }: PageProps<"/pricing">) {
  const sp = await searchParams;
  const { userId } = await requireUser();
  const current = await getTier(userId);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Practice free. Upgrade when you want more.</h1>
        <p className="mt-2 text-muted-foreground">Every student keeps the full question bank. Paid plans add extras. Billed monthly through PayPal. Cancel anytime.</p>
      </header>
      {typeof sp.error === "string" && Object.hasOwn(ERRORS, sp.error) && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{ERRORS[sp.error]}</p>}
      <div className="grid gap-5 md:grid-cols-3">
        {CARDS.map((c) => {
          const paid = c.tier !== "free", popular = c.tier === "plus", price = paid ? PLANS[c.tier as "plus" | "pro"].priceUsd : 0;
          return (
            <section key={c.tier} aria-label={`${c.tier} plan`} className={`relative flex flex-col rounded-2xl border bg-card p-7 ${popular ? "border-2 border-foreground shadow-lg" : ""}`}>
              {popular && <span className="absolute -top-3 left-7 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">Most popular</span>}
              <p className="text-xs font-semibold tracking-wider text-muted-foreground">{c.tier.toUpperCase()}</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">${price}<span className="text-sm font-normal text-muted-foreground"> /month</span></p>
              <p className="mt-1 text-sm text-muted-foreground">{c.blurb}</p>
              {c.tier === current ? <Button variant="outline" size="lg" className="mt-5 w-full" disabled>Current plan</Button>
                : paid && current === "free" ? (
                  <form action={subscribe} className="mt-5"><input type="hidden" name="tier" value={c.tier} />
                    <Button type="submit" size="lg" variant={popular ? "default" : "outline"} className="w-full">Upgrade to {PLANS[c.tier as "plus" | "pro"].name}</Button></form>
                ) : paid ? <Button variant="outline" size="lg" className="mt-5 w-full" render={<Link href="/settings#plan" />}>Manage plan</Button>
                : <div className="mt-5 h-11" />}
              <ul className="mt-5 flex flex-col gap-2 text-sm">
                {c.features.map((f) => (
                  <li key={f.text} className={`flex gap-2 ${f.has ? "" : "text-muted-foreground/60"}`}>
                    {f.has ? <Check className="mt-0.5 size-4 shrink-0" aria-label="Included" /> : <Minus className="mt-0.5 size-4 shrink-0" aria-label="Not included" />}{f.text}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">Prices in USD. Remixes are AI-generated practice, not official questions.</p>
    </div>
  );
}
