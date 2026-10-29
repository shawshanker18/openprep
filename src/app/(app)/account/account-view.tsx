import Link from "next/link";
import { ChevronRight, CreditCard, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, type AccountSummary } from "@/components/app-nav";
import { FeedbackForm } from "@/components/feedback-form";

const ROW = "flex min-h-12 items-center gap-3 px-4 text-sm hover:bg-muted";

export function AccountView({ account, planName, signOut }: { account: AccountSummary; planName: string; signOut: () => Promise<void> }) {
  return (
    <div className="flex max-w-xl flex-col gap-8">
      <h1 className="text-2xl font-semibold">Your account</h1>

      <section aria-label="Profile" className="flex items-center gap-4 rounded-xl border p-5">
        <Avatar account={account} className="size-16 text-2xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-medium">{account.name}</p>
          {account.email && account.email !== account.name && <p className="truncate text-sm text-muted-foreground">{account.email}</p>}
          <p className="mt-1 text-sm"><span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">{planName} plan</span></p>
        </div>
      </section>

      <nav aria-label="Account" className="flex flex-col divide-y overflow-hidden rounded-xl border">
        <Link href="/settings" className={ROW}><Settings className="size-4" /><span className="flex-1">Settings, goals and reminders</span><ChevronRight className="size-4 text-muted-foreground" /></Link>
        <Link href="/pricing" className={ROW}><CreditCard className="size-4" /><span className="flex-1">Plan and billing</span><ChevronRight className="size-4 text-muted-foreground" /></Link>
      </nav>

      <section id="feedback" className="flex scroll-mt-20 flex-col gap-3">
        <div>
          <h2 className="font-medium">Send feedback</h2>
          <p className="text-sm text-muted-foreground">Bugs, errors, reviews and ideas all welcome. We read every message.</p>
        </div>
        <FeedbackForm />
      </section>

      <form action={signOut}><Button type="submit" variant="outline"><LogOut />Sign out</Button></form>
    </div>
  );
}
