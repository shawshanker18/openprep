"use client";
import { setChecklistHidden, useChecklistHidden } from "@/lib/checklist-visibility";

/** Settings switch that brings the "Getting started" list back (or hides it) in the menu. */
export function ChecklistToggle() {
  const hidden = useChecklistHidden();
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input type="checkbox" checked={!hidden} onChange={(e) => setChecklistHidden(!e.target.checked)} />
      Show the “Getting started” list in the menu
    </label>
  );
}
