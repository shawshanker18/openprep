"use client";

import { useState } from "react";
import { askedChapters } from "@/content/cbse-chapters";

/**
 * Class 11 maths chapters that have their own course. Ticked chapters are sent as `chapters` form values (and mirrored to
 * `onChange`, which the onboarding form uses). Renders nothing for other classes, which are not asked.
 */
export function CbseChapterPicker({ defaultChecked = [], grade, onChange }: { defaultChecked?: string[]; grade?: number; onChange?: (ids: string[]) => void }) {
  const [checked, setChecked] = useState<Set<string>>(new Set(defaultChecked));
  if (grade !== 11) return null;
  const toggle = (id: string, on: boolean) => {
    const next = new Set(checked);
    if (on) next.add(id); else next.delete(id);
    setChecked(next);
    onChange?.([...next]);
  };
  return (
    <div className="flex flex-col gap-1">
      {askedChapters(11).map((ch) => (
        <label key={ch.id} className="flex min-h-9 items-center gap-2 text-sm">
          <input type="checkbox" name="chapters" value={ch.id} checked={checked.has(ch.id)} onChange={(e) => toggle(ch.id, e.target.checked)} /> {ch.title}
        </label>
      ))}
    </div>
  );
}
