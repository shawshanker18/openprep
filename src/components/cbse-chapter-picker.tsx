"use client";

import { useState } from "react";
import { CBSE_CHAPTERS } from "@/content/cbse-chapters";

const GRADES = [9, 10, 11, 12] as const;

/**
 * CBSE maths chapters by class. Ticked chapters are sent as `chapters` form values (and mirrored to `onChange`, which the
 * onboarding form uses). Classes up to the student's grade start open.
 */
export function CbseChapterPicker({ defaultChecked = [], grade, onChange }: { defaultChecked?: string[]; grade?: number; onChange?: (ids: string[]) => void }) {
  const [checked, setChecked] = useState<Set<string>>(new Set(defaultChecked));
  const update = (next: Set<string>) => { setChecked(next); onChange?.([...next]); };
  const toggle = (id: string, on: boolean) => { const next = new Set(checked); if (on) next.add(id); else next.delete(id); update(next); };
  const setGrade = (g: number, on: boolean) => { const next = new Set(checked); for (const ch of CBSE_CHAPTERS) if (ch.grade === g) { if (on) next.add(ch.id); else next.delete(ch.id); } update(next); };
  return (
    <div className="flex flex-col gap-2">
      {GRADES.map((g) => {
        const chapters = CBSE_CHAPTERS.filter((ch) => ch.grade === g);
        const n = chapters.filter((ch) => checked.has(ch.id)).length;
        return (
          <details key={g} open={grade != null && g < grade} className="rounded-lg border p-3">
            <summary className="flex min-h-9 cursor-pointer items-center justify-between gap-3 text-sm font-medium">
              <span>Class {g}</span><span className="text-xs font-normal text-muted-foreground">{n} of {chapters.length} done</span>
            </summary>
            <div className="mt-3 flex flex-col gap-1">
              <button type="button" onClick={() => setGrade(g, n !== chapters.length)} className="mb-1 min-h-9 self-start text-sm underline">
                {n === chapters.length ? "Clear class" : `I finished all of Class ${g}`}
              </button>
              {chapters.map((ch) => (
                <label key={ch.id} className="flex min-h-9 items-center gap-2 text-sm">
                  <input type="checkbox" name="chapters" value={ch.id} checked={checked.has(ch.id)} onChange={(e) => toggle(ch.id, e.target.checked)} /> {ch.title}
                </label>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
