import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NavLinks } from "@/components/app-nav";
import { BuyPanel, type BuyOption } from "../(app)/pricing/buy-panel";
import { UpgradeConfirmation } from "../(app)/pricing/success/confirmation";
import { quote, type Billing } from "@/lib/membership";
import { upcomingSatDates } from "@/lib/sat-dates";

export default async function Preview({ searchParams }: { searchParams: Promise<{ current?: string; screen?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const sp = await searchParams;
  const current = sp.current === "plus" ? "plus" : sp.current === "pro" ? "pro" : "free";
  const now = new Date();
  const options: BuyOption[] = [
    ...upcomingSatDates(now.toISOString().slice(0, 10)).slice(0, 2).map((date) => ({ billing: `until_test:${date}`, label: `${new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })} SAT · ${date}`, note: `Access through the day after the ${date} SAT.` })),
    { billing: "monthly", label: "Monthly", note: "30 days of access. One payment, no automatic renewal." },
    { billing: "quarterly", label: "Quarterly", note: "90 days of access. Save compared with buying three monthly passes." },
  ].map((c) => {
    const [billing, exam] = c.billing.split(":");
    const get = (tier: "plus" | "pro") => quote(tier, billing as Billing, exam, now)!;
    return {...c, prices: {plus: get("plus").cents, pro: get("pro").cents}, days: get("plus").days};
  });
  const name = current === "free" ? "Free" : current === "plus" ? "Plus" : "Pro";
  return <div className="flex min-h-screen">
    <aside className="dark fixed inset-y-0 hidden w-56 flex-col bg-background p-4 text-foreground md:flex"><p className="mb-8 px-2 text-xl font-bold">OpenPrep</p><Suspense><NavLinks /></Suspense></aside>
    <main className="min-w-0 flex-1 p-5 sm:p-8 md:ml-56">
      <div className="mx-auto mb-8 flex max-w-4xl flex-wrap items-center gap-3 rounded-xl border bg-muted/40 p-3 text-sm">
        <span className="mr-auto text-muted-foreground">Local UI preview · Sample data · Payments disabled</span>
        {(["free", "plus", "pro"] as const).map(t => <Link key={t} className={`rounded-md px-2 py-1 capitalize ${current === t ? "bg-foreground text-background" : "hover:bg-muted"}`} href={`/upgrade-preview?current=${t}${sp.screen === "success" ? "&screen=success" : ""}`}>{t}</Link>)}
        <Link className="underline underline-offset-4" href={`/upgrade-preview?current=${current}&screen=${sp.screen === "success" ? "plans" : "success"}`}>{sp.screen === "success" ? "Back to upgrade" : "Try congratulations"}</Link>
      </div>
      {sp.screen === "success" ? <UpgradeConfirmation tier={current === "free" ? "plus" : current} days={30} status="completed" /> : <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your next step starts here.</h1><p className="mt-3 max-w-2xl text-muted-foreground">Unlock more ways to prepare with Plus or Pro. Choose your plan and how long you need it. Nothing renews automatically.</p></header>
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-muted/40 p-5"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Your current plan</p><p className="mt-1 text-xl font-semibold">OpenPrep {name}</p></div><p className="text-sm text-muted-foreground">{current === "free" ? "Compare your upgrade options below." : "Paid time is preserved when you upgrade."}</p></section>
        <BuyPanel current={current} clientId={null} options={options} />
      </div>}
    </main>
  </div>;
}
