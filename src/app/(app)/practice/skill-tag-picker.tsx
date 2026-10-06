"use client";

import { useState } from "react";
import { DOMAINS, type DomainId } from "@/content/taxonomy";

/** Skills grouped by domain, plus the sub-topics (question tags) of whichever skills are ticked. */
export function SkillTagPicker({ skills, tagsBySkill, name }: {
  skills: { id: string; name: string; domain: DomainId }[]; tagsBySkill: Record<string, string[]>; name: string;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [domain, setDomain] = useState("");
  const tags = [...new Set(picked.flatMap((id) => tagsBySkill[id] ?? []))].sort();
  const domains = [...new Set(skills.map((s) => s.domain))];
  return (
    <>
      {picked.map(id => <input key={id} type="hidden" name={name} value={id} />)}
      <label className="flex flex-col gap-1 text-sm">Topic
        <select value={domain} onChange={e => setDomain(e.target.value)} className="h-10 rounded-md border bg-background px-3">
          <option value="">Choose a topic (optional)</option>
          {domains.map(d => <option key={d} value={d}>{DOMAINS[d].section === "math" ? "Math" : "Reading and Writing"} · {DOMAINS[d].name}</option>)}
        </select>
      </label>
      {picked.length > 0 && <div className="flex flex-wrap gap-2 text-sm">
        {picked.map(id => <button type="button" key={id} className="rounded-full border px-3 py-1" onClick={() => setPicked(p => p.filter(x => x !== id))} aria-label={`Remove ${skills.find(s => s.id === id)?.name}`}>{skills.find(s => s.id === id)?.name} ×</button>)}
      </div>}
      <fieldset className="flex flex-col gap-2 text-sm">
        {domains.filter(d => d === domain).map((d) => (
          <div key={d} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{DOMAINS[d].name}</span>
            {skills.filter((s) => s.domain === d).map((s) => (
              <label key={s.id} className="flex gap-2">
                <input type="checkbox" checked={picked.includes(s.id)} value={s.id}
                  onChange={(e) => setPicked((p) => e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id))} />
                {s.name}
              </label>
            ))}
          </div>
        ))}
      </fieldset>
      {tags.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Subtopics (optional)</summary>
          <fieldset className="mt-2 flex flex-col gap-1">
          {tags.map((t) => <label key={t} className="flex gap-2"><input type="checkbox" name="tags" value={t} />{t.replace(/-/g, " ")}</label>)}
          </fieldset>
        </details>
      )}
    </>
  );
}
