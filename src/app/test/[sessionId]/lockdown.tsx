"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { inNativeApp, setLockdown } from "@/lib/native";
import { markLockdown, reportFocusLoss } from "./actions";

/**
 * In the apps the whole test (or diagnostic) is locked: the only way out is to finish or end it. The session is
 * marked so it can't be carried on, unlocked, in a browser.
 */
export function useTestLockdown(sessionId: string) {
  useEffect(() => {
    setLockdown(true);
    if (inNativeApp()) void markLockdown(sessionId);
    return () => setLockdown(false);
  }, [sessionId]);
  // The app reopens a locked test with ?resumed=1 after it was closed or killed mid-test: that counts as leaving.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("resumed") !== "1") return;
    url.searchParams.delete("resumed");
    window.history.replaceState(null, "", url.pathname + url.search);
    void reportFocusLoss(sessionId);
    toast.warning("The app was closed during your test. This is noted on your results.");
  }, [sessionId]);
}

/** The way out of a locked test (asks first). `action` ends it on the server and redirects. */
export function EndTest({ action, detail }: { action: () => Promise<void>; detail: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>End test</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End this test?</DialogTitle>
          <DialogDescription>{detail}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Keep going</DialogClose>
          <form action={action}><Button type="submit" variant="destructive">End test</Button></form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
