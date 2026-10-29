"use client";

import { useState } from "react";
import { askedChapters } from "@/content/cbse-chapters";

/**
 * Class 11 maths chapters that have their own course. Ticked chapters are sent as `chapters` form values (and mirrored to
 * `onChange`, which the onboarding form uses). Shown to every CBSE maths student, whatever their class: what matters is
 * which chapters they finished at school, not which class they are in.
 */
export function CbseChapterPicker({ defaultChecked = [], onChange }: { defaultChecked?: string[]; onChange?: (ids: string[]) => void }) {
  const [checked, setChecked] = useState<Set<string>>(new Set(defaultChecked));
  const toggle = (id: string, on: boolean) => {
    const next = new Set(checked);
    if (on) next.add(id); else next.delete(id);
    setChecked(next);
    onChange?.([...next]);
  };
  return (
    <div className="grid gap-x-6 gap-y-1 [grid-template-columns:repeat(auto-fill,minmax(min(100%,16rem),1fr))]">
      {askedChapters().map((ch) => (
        <label key={ch.id} className="flex min-h-9 items-center gap-2 text-sm">
          <input type="checkbox" name="chapters" value={ch.id} checked={checked.has(ch.id)} onChange={(e) => toggle(ch.id, e.target.checked)} /> {ch.title}
        </label>
      ))}
    </div>
  );
}
