"use client";

import { useState } from "react";
import { DOMAINS, type DomainId } from "@/content/taxonomy";

/** Skills grouped by domain, plus the sub-topics (question tags) of whichever skills are ticked. */
export function SkillTagPicker({ skills, tagsBySkill, name }: {
  skills: { id: string; name: string; domain: DomainId }[]; tagsBySkill: Record<string, string[]>; name: string;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const tags = [...new Set(picked.flatMap((id) => tagsBySkill[id] ?? []))].sort();
  const domains = [...new Set(skills.map((s) => s.domain))];
  return (
    <>
      <fieldset className="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm">
        {domains.map((d) => (
          <div key={d} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{DOMAINS[d].name}</span>
            {skills.filter((s) => s.domain === d).map((s) => (
              <label key={s.id} className="flex gap-2">
                <input type="checkbox" name={name} value={s.id}
                  onChange={(e) => setPicked((p) => e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id))} />
                {s.name}
              </label>
            ))}
          </div>
        ))}
      </fieldset>
      {tags.length > 0 && (
        <fieldset className="flex max-h-32 flex-col gap-1 overflow-y-auto text-sm">
          <span className="text-xs text-muted-foreground">Sub topics (optional; leave all unticked to include every one)</span>
          {tags.map((t) => <label key={t} className="flex gap-2"><input type="checkbox" name="tags" value={t} />{t.replace(/-/g, " ")}</label>)}
        </fieldset>
      )}
    </>
  );
}
