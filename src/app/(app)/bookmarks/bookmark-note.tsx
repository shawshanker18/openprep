"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { updateBookmarkNote } from "./actions";

export function BookmarkNote({ questionId, note }: { questionId: string; note: string }) {
  const id = useId();
  const [value, setValue] = useState(note);
  const [edited, setEdited] = useState(false);
  const [state, action, pending] = useActionState(updateBookmarkNote.bind(null, questionId), { ok: false, message: "" });
  return (
    <form action={action} onSubmit={() => setEdited(false)} className="mt-2 flex flex-col gap-2">
      <label htmlFor={id} className="font-medium">Your notes</label>
      <textarea id={id} name="note" value={value} maxLength={2000} rows={3} disabled={pending}
        onChange={e => { setValue(e.target.value); setEdited(true); }}
        placeholder="Write a reminder, approach, or something to review…"
        className="w-full resize-y rounded-lg border bg-background p-3 outline-none focus:ring-2 focus:ring-ring" />
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" type="submit" disabled={pending}>{pending ? "Saving…" : "Save notes"}</Button>
        <span className="text-xs text-muted-foreground">{value.length}/2,000</span>
        {!edited && state.message && <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-muted-foreground" : "text-destructive"}>{state.message}</p>}
      </div>
    </form>
  );
}
