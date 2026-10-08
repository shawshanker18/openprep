"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FeedbackForm } from "@/components/feedback-form";

/** "Send feedback" in the app's menu: the form in a dialog, so the student stays where they are. */
export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground side:h-[clamp(1.375rem,5.6dvh,2.125rem)] side:py-0 hover:bg-muted hover:text-foreground">
        <MessageSquare className="size-4" />Send feedback
      </DialogTrigger>
      <DialogContent className="gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>Bugs, errors, reviews and ideas all welcome. We read every message.</DialogDescription>
        </DialogHeader>
        <FeedbackForm />
      </DialogContent>
    </Dialog>
  );
}
