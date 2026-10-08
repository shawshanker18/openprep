"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
          <form action={action}><Button type="submit" className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600/40">End test</Button></form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
