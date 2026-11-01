"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WalkthroughStep = { key: string; title: string; group?: string; body: ReactNode };

/**
 * Khan Academy-style walkthrough: one subtopic at a time instead of one long scroll. The body of each step carries
 * its own heading, so only the progress, the clickable step dots and the Back/Next bar are rendered here.
 */
export function Walkthrough({ steps }: { steps: WalkthroughStep[] }) {
  const [i, setI] = useState(0);
  const current = Math.min(i, steps.length - 1);
  const step = steps[current];
  useEffect(() => { window.scrollTo({ top: 0 }); }, [current]);
  if (!step) return null;
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted-foreground tabular-nums">Subtopic {current + 1} of {steps.length}</span>
          {step.group && <span className="text-xs font-medium text-muted-foreground">{step.group}</span>}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar"
          aria-valuenow={current + 1} aria-valuemin={0} aria-valuemax={steps.length} aria-label="Lesson progress">
          <div className="h-full bg-primary transition-all" style={{ width: `${(100 * (current + 1)) / steps.length}%` }} />
        </div>
        {steps.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="navigation" aria-label="Subtopics">
            {steps.map((s, n) => (
              <button key={s.key} type="button" onClick={() => setI(n)} title={s.title} aria-current={n === current ? "step" : undefined} aria-label={`Subtopic ${n + 1}: ${s.title}`}
                className={cn("flex size-8 items-center justify-center rounded-full border text-xs tabular-nums",
                  n === current ? "border-primary bg-primary font-medium text-primary-foreground" : "hover:bg-muted")}>
                {n + 1}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="min-w-0">{step.body}</div>
      {steps.length > 1 && (
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <Button variant="ghost" onClick={() => setI(current - 1)} disabled={current === 0}><ChevronLeft className="size-4" />Back</Button>
          {current < steps.length - 1
            ? <Button onClick={() => setI(current + 1)}>Next subtopic<ChevronRight className="size-4" /></Button>
            : <span className="text-sm text-muted-foreground">End of the lesson</span>}
        </div>
      )}
    </div>
  );
}
