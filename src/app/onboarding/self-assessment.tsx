"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DOMAINS, skillsIn, type DomainId } from "@/content/taxonomy";
import { cn } from "@/lib/utils";
import { submitSelfAssessment } from "./actions";
import { Choice } from "@/components/ui/choice";

type Rating = 0 | 1 | 2 | 3;
const LABELS = ["Don't know", "A little", "Know it", "Very confident"] as const;

export function SelfAssessment() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ratings, setRatings] = useState<Record<string, Rating | null>>({});

  const save = (r: Record<string, Rating | null>) => start(async () => {
    const res = await submitSelfAssessment(r).catch(() => ({ ok: false as const, error: "Couldn't save your ratings. Check your connection and try again." }));
    if (!res.ok) toast.error(res.error);
    else router.refresh();
  });

  return (
    <div className="flex flex-col gap-8">
      {(["rw", "math"] as const).map((section) => (
        <section key={section} className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold">{section === "rw" ? "Reading and Writing" : "Math"}</h2>
          {(Object.keys(DOMAINS) as DomainId[]).filter((d) => DOMAINS[d].section === section).map((d) => (
            <div key={d} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">{DOMAINS[d].name}</h3>
                <Choice size="sm" aria-label={`Set all in ${DOMAINS[d].name}`} className="w-36 text-xs" value={null} placeholder="Set all…"
                  options={LABELS.map((l, i) => ({ value: String(i), label: l }))}
                  onValueChange={(v) => {
                    const n = Number(v) as Rating;
                    setRatings((r) => ({ ...r, ...Object.fromEntries(skillsIn(d).map((s) => [s.id, n])) }));
                  }} />
              </div>
              {skillsIn(d).map((s) => (
                <div key={s.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm">{s.name}</span>
                  <div role="radiogroup" aria-label={s.name} className="inline-flex shrink-0 overflow-hidden rounded-md border text-xs">
                    {LABELS.map((l, i) => (
                      <button key={l} type="button" role="radio" disabled={pending} aria-checked={ratings[s.id] === i}
                        tabIndex={ratings[s.id]===i || (ratings[s.id]==null && i===0)?0:-1}
                        onKeyDown={(event)=>{
                          const step=event.key==='ArrowRight'||event.key==='ArrowDown'?1:event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:0;
                          if(!step || pending)return;
                          event.preventDefault();const next=(i+step+LABELS.length)%LABELS.length;
                          setRatings(r=>({...r,[s.id]:next as Rating}));
                          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button[role=radio]')[next]?.focus();
                        }}
                        onClick={() => setRatings((r) => ({ ...r, [s.id]: i as Rating }))}
                        className={cn("border-l px-2 py-1.5 first:border-l-0", ratings[s.id] === i ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" disabled={pending} onClick={() => save(ratings)}>Continue</Button>
        <Button size="lg" variant="outline" disabled={pending} onClick={() => save({})}>Skip and just test me</Button>
      </div>
    </div>
  );
}
