import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckPaymentStatus } from "./check-status";
import { PLANS, type PaidTier } from "@/lib/tiers";

export function UpgradeConfirmation({ tier, days, status }: { tier: PaidTier; days: number; status: string }) {
  const complete = status === "completed";
  const refunded = status === "refunded";
  const name = PLANS[tier].name;
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-8 text-center sm:py-16">
      {complete && <div aria-hidden="true" className="upgrade-confetti-overlay pointer-events-none fixed inset-0 z-20 overflow-hidden">
        {Array.from({ length: 48 }, (_, i) => <span key={i} className="upgrade-confetti" style={{
          left: i % 2 ? "100%" : "0%",
          "--confetti-x": `${(i % 2 ? -1 : 1) * (12 + (i * 17) % 74)}vw`,
          "--confetti-rise": `${-(38 + (i * 13) % 44)}vh`,
          "--confetti-spin": `${(i % 2 ? -1 : 1) * (180 + (i * 31) % 540)}deg`,
          backgroundColor: ["#c4b5fd", "#93c5fd", "#f9a8d4", "#fcd34d", "#86efac"][i % 5],
          borderRadius: i % 3 === 0 ? "50%" : "2px",
          width: `${5 + i % 4}px`,
          height: `${7 + i % 6}px`,
          animationDelay: `${(i % 12) * 35}ms`,
          animationDuration: `${2800 + (i % 7) * 160}ms`,
        } as CSSProperties} />)}
      </div>}
      <div className={`relative mb-8 flex size-32 items-center justify-center rounded-full bg-muted ${complete ? "upgrade-celebration" : ""}`}>
        {complete ? <Check className="size-14" strokeWidth={1.5} /> : <Sparkles className="size-14" strokeWidth={1.5} />}
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{complete ? `Congratulations! You’ve got ${name}.` : refunded ? "This purchase was refunded." : "Confirming your upgrade…"}</h1>
      <p className="mt-4 text-muted-foreground">{complete ? `${days} days of ${name} have been added to your account. Your next chapter of SAT prep starts here.` : refunded ? "You can view your current access in Settings." : "PayPal is still confirming your payment. Check again in a moment; your plan is added as soon as payment is confirmed."}</p>
      {complete && <div className="upgrade-plan-reveal mt-8 w-full rounded-2xl border bg-card p-6 shadow-sm"><Sparkles className="mx-auto mb-3 size-6" /><p className="text-2xl font-semibold">OpenPrep {name}</p><p className="mt-2 text-sm text-muted-foreground">{name === "Pro" ? "All practice tests · Unlimited AI remixing" : "All practice tests · 50 AI remixes each month"}</p></div>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {complete || refunded ? <Button size="lg" render={<Link href={complete ? "/practice" : "/pricing"} />}>{complete ? "Let’s practice" : "View plans"}<ArrowRight className="size-4" /></Button> : <CheckPaymentStatus />}
        <Button size="lg" variant="outline" render={<Link href="/account#plan" />}>View my membership</Button>
      </div>
    </div>
  );
}
