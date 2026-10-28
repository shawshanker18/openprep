import { Sparkles } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getMembership } from "@/server/subscription";
import { PLANS } from "@/lib/tiers";
import { paypalConfigured } from "@/server/paypal";
import { quote, tierAt } from "@/lib/membership";
import { upcomingSatDates } from "@/lib/sat-dates";
import { BuyPanel, type BuyOption } from "./buy-panel";

export const metadata = { title: "Upgrade" };

const niceDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function Pricing() {
  const { userId } = await requireUser();
  const now = new Date();
  const blocks = await getMembership(userId, now);
  const current = tierAt(blocks, now);
  const active = blocks.find((b) => b.tier === current && b.startsAt <= now && now < b.endsAt);
  const sats = upcomingSatDates(now.toISOString().slice(0, 10)).slice(0, 2).map((date) => {
    const when = new Date(`${date}T00:00:00Z`);
    return {
      billing: `until_test:${date}`,
      label: `${when.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })} SAT · ${niceDate(when)}`,
      note: `Access through the day after the ${niceDate(when)} SAT. One payment.`,
    };
  });
  const choices = [
    ...sats,
    { billing: "monthly", label: "Monthly", note: "30 days of access. One payment, no automatic renewal." },
    { billing: "quarterly", label: "Quarterly", note: "90 days of access. Save compared with buying three monthly passes." },
  ];
  const options: BuyOption[] = choices.map((c) => {
    const [billing, exam] = c.billing.split(":");
    const get = (tier: "plus" | "pro") => quote(tier, billing as "monthly" | "quarterly" | "until_test", exam, now)!;
    return { ...c, prices: { plus: get("plus").cents, pro: get("pro").cents }, days: get("plus").days };
  });

  return (
    <div className="@container mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6 sm:gap-8">
      <header>
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground"><Sparkles className="size-4" />A little more practice. A lot more possibility.</p>
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">Your next step starts here.</h1>
        <p className="mt-3 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">Unlock more ways to prepare with Plus or Pro. Choose your plan and how long you need it. Nothing renews automatically.</p>
      </header>
      <section aria-label="Your current plan" className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
        <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your current plan</p><p className="mt-1 text-xl font-semibold">OpenPrep {current === "free" ? "Free" : PLANS[current].name}</p></div>
        <div className="text-sm text-muted-foreground sm:text-right">{active ? <><p className="font-medium text-foreground">Active until {niceDate(active.endsAt)}</p><p>Paid time is preserved when you upgrade.</p></> : <><p className="font-medium text-foreground">Ready for more?</p><p>Compare your upgrade options below.</p></>}</div>
      </section>
      <BuyPanel current={current} clientId={paypalConfigured() ? process.env.PAYPAL_CLIENT_ID! : null} options={options} />
      <p className="text-balance text-center text-xs text-muted-foreground">All prices in USD. One-time payments. AI remixes are practice questions, not official SAT questions.</p>
    </div>
  );
}
