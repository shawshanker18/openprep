import Link from "next/link";
import { ChevronRight, GraduationCap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, type AccountSummary } from "@/components/app-nav";
import { FeedbackForm } from "@/components/feedback-form";
import { ThemeSelect } from "@/components/theme";
import { LayoutSelect } from "@/components/layout-select";
import { deleteAccount } from "@/app/(app)/settings/actions";

const CARD = "flex min-w-0 flex-col gap-4 rounded-xl border p-5";
const control = "h-9 rounded-md border bg-background px-2 text-sm";

export type PlanSummary = {
  name: string; paid: boolean;
  blocks: { key: string; name: string; until: string }[];
  ending: { days: number } | null;
  remixesLeft: number | null;
};

export function AccountView({ account, plan, signOut, error, planStatus }: {
  account: AccountSummary; plan: PlanSummary; signOut: () => Promise<void>; error?: string; planStatus?: string;
}) {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Your account</h1>
      {error === "delete" && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">Type DELETE in capitals to confirm.</p>}
      {error === "cancel" && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">We couldn&apos;t cancel with PayPal. Nothing changed. Please try again or cancel in your PayPal account.</p>}
      {planStatus === "active" && <p role="status" className="rounded-md border p-3 text-sm">You&apos;re all set. Your plan is active.</p>}
      {planStatus === "processing" && <p role="status" className="rounded-md border p-3 text-sm">PayPal is still confirming your payment. Your plan turns on in a moment. Refresh this page shortly.</p>}

      <section aria-label="Profile" className="flex flex-wrap items-center gap-4 rounded-xl border p-5">
        <Avatar account={account} className="size-16 text-2xl" />
        <div className="min-w-0 flex-1 basis-48">
          <p className="truncate text-lg font-medium">{account.name}</p>
          {account.email && account.email !== account.name && <p className="truncate text-sm text-muted-foreground">{account.email}</p>}
          <p className="mt-1"><span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">{plan.name} plan</span></p>
        </div>
        <form action={signOut}><Button type="submit" variant="outline"><LogOut />Sign out</Button></form>
      </section>

      <Link href="/settings" className="flex min-h-16 items-center gap-4 rounded-xl border p-4 hover:bg-muted">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted"><GraduationCap className="size-5" /></span>
        <span className="min-w-0 flex-1"><span className="block font-medium">Study settings</span><span className="block text-sm text-muted-foreground">Goal and schedule, reminders, school profile, official scores and the diagnostic</span></span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </Link>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="display" className={CARD}>
            <div><h2 id="display" className="font-medium">Display</h2><p className="text-sm text-muted-foreground">Saved in this browser, so each of your devices can look different.</p></div>
            <ThemeSelect />
            <LayoutSelect />
          </section>

          <section id="plan" aria-labelledby="plan-h" className={`${CARD} scroll-mt-20`}>
            <h2 id="plan-h" className="font-medium">Plan</h2>
            {!plan.paid ? (
              <p className="text-sm">You&apos;re on the Free plan. <Link className="underline" href="/pricing">See Plus and Pro</Link></p>
            ) : (
              <div className="flex flex-col gap-2 text-sm">
                <ul className="flex flex-col gap-1">{plan.blocks.map((b) => <li key={b.key}><b>{b.name}</b> until {b.until}</li>)}</ul>
                {plan.ending && <p role="status" className="rounded-md border border-foreground p-3 font-medium">Your plan ends {plan.ending.days <= 0 ? "today" : `in ${plan.ending.days} day${plan.ending.days === 1 ? "" : "s"}`}. <Link className="underline" href="/pricing">Add more time</Link></p>}
                <p className="text-muted-foreground">One-time payments. Nothing renews by itself, and you go back to Free when your paid time ends.</p>
                <p className="text-muted-foreground">{plan.remixesLeft === null ? "Unlimited AI remixes." : `${plan.remixesLeft} of 50 AI remixes left this month.`}</p>
                <Link className="underline" href="/pricing">Buy more time or upgrade</Link>
              </div>
            )}
          </section>

          <section aria-labelledby="privacy" className={CARD}>
            <h2 id="privacy" className="font-medium">Privacy</h2>
            <p className="text-sm text-muted-foreground">How we handle your answers, scores and sign-in details.</p>
            <Link href="/privacy" className="self-start text-sm underline">Read the Privacy Policy</Link>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section id="feedback" aria-labelledby="feedback-h" className={`${CARD} scroll-mt-20`}>
            <div><h2 id="feedback-h" className="font-medium">Send feedback</h2><p className="text-sm text-muted-foreground">Bugs, errors, reviews and ideas all welcome. We read every message.</p></div>
            <FeedbackForm />
          </section>

          <form action={deleteAccount} className="flex min-w-0 flex-col gap-3 rounded-xl border border-destructive/40 p-5">
            <h2 className="font-medium">Delete my account</h2>
            <p className="text-sm text-muted-foreground">Permanently deletes your account and all your answers, scores and plans. This can&apos;t be undone.</p>
            <label className="flex flex-col gap-1 text-sm">Type DELETE to confirm
              <input name="confirm" autoComplete="off" required className={`${control} w-40`} /></label>
            <Button type="submit" variant="destructive" className="self-start">Delete account</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
