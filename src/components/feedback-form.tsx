"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { sendFeedback, type FeedbackKind } from "@/app/feedback/actions";
import { cn } from "@/lib/utils";

const KINDS: { value: FeedbackKind; label: string }[] = [
  { value: "bug", label: "Report a bug" },
  { value: "error", label: "Something broke or showed an error" },
  { value: "review", label: "Leave a review" },
  { value: "idea", label: "Suggest an idea" },
  { value: "other", label: "Something else" },
];
const PROMPT: Record<FeedbackKind, string> = {
  bug: "What went wrong? What did you click, and what did you expect to happen?",
  error: "What were you doing when it broke?",
  review: "What do you like, and what would make OpenPrep better?",
  idea: "What should we add or change?",
  other: "Your message",
};

/** Feedback of any kind. `page` is where it's about (the address it was sent from, unless given). */
export function FeedbackForm({ kind: initialKind = "bug", page, prefill = "", onSent }: {
  kind?: FeedbackKind; page?: string; prefill?: string; onSent?: () => void;
}) {
  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState(prefill);
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const where = page ?? `${window.location.pathname}${window.location.search}`.slice(0, 300);
      const res = await sendFeedback({ kind, rating: kind === "review" ? rating : null, message, contact: contact || undefined, page: where })
        .catch(() => ({ ok: false as const, error: "Couldn't send it. Check your connection and try again." }));
      if (!res.ok) { setError(res.error); return; }
      setSent(true);
      onSent?.();
    });
  };

  if (sent) {
    return (
      <div role="status" className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
        <p className="font-medium">Thank you! We read every message.</p>
        <button type="button" className="self-start underline" onClick={() => { setSent(false); setMessage(""); setRating(null); }}>Send another</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">What is it about?
        <Choice value={kind} onValueChange={(v) => setKind(v as FeedbackKind)} options={KINDS} />
      </label>
      {kind === "review" && (
        <div className="flex flex-col gap-1 text-sm">
          <span id="rating-label">Your rating (optional)</span>
          <div role="group" aria-labelledby="rating-label" className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} star${n === 1 ? "" : "s"}`} aria-pressed={rating === n}
                onClick={() => setRating(rating === n ? null : n)} className="rounded p-1 hover:bg-muted">
                <Star className={cn("size-6", rating != null && n <= rating ? "fill-amber-400 text-amber-500" : "text-muted-foreground")} />
              </button>
            ))}
          </div>
        </div>
      )}
      <label className="flex flex-col gap-1 text-sm">{PROMPT[kind]}
        <textarea required minLength={5} maxLength={4000} rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-base" />
      </label>
      <label className="flex flex-col gap-1 text-sm">How can we reach you? (optional)
        <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} placeholder="Email or another way to contact you"
          className="h-11 rounded-md border bg-background px-3 text-base" />
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="self-start" disabled={pending}>{pending ? "Sending…" : "Send feedback"}</Button>
    </form>
  );
}
