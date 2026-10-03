import Link from "next/link";
import { FeedbackForm } from "@/components/feedback-form";
import type { FeedbackKind } from "./actions";

export const metadata = { title: "Send feedback" };

const KINDS: FeedbackKind[] = ["bug", "error", "review", "idea", "other"];

/** Feedback from anyone, signed in or not. The error screen links here with `kind=error`, its reference and page. */
export default async function FeedbackPage({ searchParams }: PageProps<"/feedback">) {
  const sp = await searchParams;
  const kind = KINDS.includes(sp.kind as FeedbackKind) ? (sp.kind as FeedbackKind) : "bug";
  const ref = typeof sp.ref === "string" && /^[\w-]{1,40}$/.test(sp.ref) ? sp.ref : null;
  const from = typeof sp.from === "string" && /^\/[^\s]{0,299}$/.test(sp.from) && !sp.from.startsWith("//") ? sp.from : undefined;
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-12">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← OpenPrep</Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Send feedback</h1>
        <p className="text-muted-foreground">Found a bug, hit an error, or have an idea or a review? Tell us. Security problems go to <Link className="underline" href="/security">the security page</Link>.</p>
      </div>
      <FeedbackForm kind={kind} page={from} prefill={ref ? `(Error reference: ${ref})\n\n` : ""} />
    </main>
  );
}
