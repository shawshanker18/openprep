"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { reportQuestion } from "./actions";

type Reason = "wrong_answer" | "unclear" | "typo" | "other";
const REASONS: { value: Reason; label: string }[] = [
  { value: "wrong_answer", label: "The answer is wrong" },
  { value: "unclear", label: "It's unclear" },
  { value: "typo", label: "Typo or formatting" },
  { value: "other", label: "Something else" },
];

/** Report a question. A real dialog, not window.prompt: the desktop app has no prompt(), and Cancel must not send. */
export function ReportQuestion({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("wrong_answer");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const send = () => start(async () => {
    const res = await reportQuestion({ questionId, reason, note: note.trim() || undefined })
      .catch(() => ({ ok: false as const, error: "Couldn't send the report. Check your connection and try again." }));
    if (!res.ok) { toast.error(res.error); return; }
    toast.success("Thanks, we'll take a look.");
    setOpen(false);
    setNote("");
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" aria-label="Report question" />}><Flag /></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this question</DialogTitle>
          <DialogDescription>Tell us what&apos;s wrong and we&apos;ll fix it.</DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1 text-sm">What&apos;s wrong?
          <Choice value={reason} onValueChange={(v) => setReason(v as Reason)} options={REASONS} />
        </label>
        <label className="flex flex-col gap-1 text-sm">Details (optional)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3}
            className="rounded-md border bg-background px-3 py-2 text-base" />
        </label>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button disabled={pending} onClick={send}>{pending ? "Sending…" : "Send report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
