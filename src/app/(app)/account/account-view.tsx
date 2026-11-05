"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, GraduationCap, LogOut, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, type AccountSummary } from "@/components/app-nav";
import { FeedbackForm } from "@/components/feedback-form";
import { ThemeSelect } from "@/components/theme";
import { TabletLayoutSelect } from "@/components/layout-select";
import { deleteAccount } from "@/app/(app)/settings/actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const CARD = "flex min-w-0 flex-col gap-4 rounded-xl border border-border/80 bg-card p-5 shadow-xs";
const control = "h-9 rounded-md border border-border/80 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

export function AccountView({
  account,
  signOut,
  error,
  touchSeen,
  tabletLayout,
}: {
  account: AccountSummary;
  plan?: unknown;
  signOut: () => Promise<void>;
  error?: string;
  planStatus?: string;
  touchSeen: boolean;
  tabletLayout: "tabs" | "sidebar";
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>

      {error === "delete" && (
        <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Type DELETE in capitals to confirm.
        </p>
      )}

      {/* User Profile */}
      <section aria-label="Profile" className="flex flex-wrap items-center gap-4 rounded-xl border border-border/80 bg-card p-5 shadow-xs">
        <Avatar account={account} className="size-16 text-2xl" />
        <div className="min-w-0 flex-1 basis-48">
          <p className="truncate text-lg font-semibold">{account.name}</p>
          {account.email && account.email !== account.name && (
            <p className="truncate text-sm text-muted-foreground">{account.email}</p>
          )}
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline" className="gap-2 shadow-2xs">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </section>

      {/* Study Settings Link */}
      <Link
        href="/settings"
        className="flex min-h-16 items-center gap-4 rounded-xl border border-border/80 bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-muted/40 shadow-xs"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
          <GraduationCap className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Study settings</span>
          <span className="block text-sm text-muted-foreground">
            Goal and schedule, reminders, school profile, official scores and the diagnostic
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </Link>

      <div className="grid items-start gap-6 md:grid-cols-2">
        {/* Display Settings */}
        <section aria-labelledby="display" className={CARD}>
          <div>
            <h2 id="display" className="font-medium">Display</h2>
            <p className="text-sm text-muted-foreground">
              Saved for your account, so it follows you to each device you sign in on.
            </p>
          </div>
          <ThemeSelect />
          <TabletLayoutSelect value={tabletLayout} touchSeen={touchSeen} />
        </section>

        {/* Feedback & Privacy */}
        <div className="flex flex-col gap-6">
          {/* Send feedback option */}
          <section aria-labelledby="feedback-opt" className={CARD}>
            <div>
              <h2 id="feedback-opt" className="font-medium">Feedback & Support</h2>
              <p className="text-sm text-muted-foreground">
                Spotted a bug, idea, or review? We read every message.
              </p>
            </div>
            <div>
              <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                <DialogTrigger render={
                  <Button variant="outline" className="gap-2">
                    <MessageSquare className="size-4" />
                    Send feedback
                  </Button>
                } />
                <DialogContent className="gap-3 sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Send feedback</DialogTitle>
                    <DialogDescription>
                      Bugs, errors, reviews and ideas all welcome. We read every message.
                    </DialogDescription>
                  </DialogHeader>
                  <FeedbackForm onSent={() => setFeedbackOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </section>

          {/* Privacy and data */}
          <section aria-labelledby="data" className={CARD}>
            <div>
              <h2 id="data" className="font-medium">Privacy and data</h2>
              <p className="text-sm text-muted-foreground">
                How we handle your answers, scores and sign-in details.
              </p>
            </div>
            <Link href="/privacy" className="self-start text-sm underline hover:text-foreground">
              Read the Privacy Policy
            </Link>

            {/* Subtle neutral delete account - no red border, no red button */}
            <form action={deleteAccount} className="mt-2 flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/20 p-4">
              <h3 className="text-sm font-medium">Delete my account</h3>
              <p className="text-sm text-muted-foreground">
                Permanently deletes your account and all your answers, scores and plans. This can&apos;t be undone.
              </p>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Type DELETE to confirm
                <input
                  name="confirm"
                  autoComplete="off"
                  required
                  placeholder="DELETE"
                  className={`${control} w-44`}
                />
              </label>
              <Button type="submit" variant="outline" className="self-start border-border text-foreground hover:bg-muted">
                Delete account
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
