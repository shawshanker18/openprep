"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FeedbackForm } from "@/components/feedback-form";

/** "Send feedback" in the app's menu: the form in a dialog, so the student stays where they are. */
export function FeedbackDialog({ iconOnly = false }: { iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger aria-label={iconOnly ? "Send feedback" : undefined} title={iconOnly ? "Send feedback" : undefined}
        className={iconOnly ? "shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          : "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"}>
        <MessageSquare className="size-4" />{!iconOnly && "Send feedback"}
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
