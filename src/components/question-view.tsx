"use client";

import { Check, X } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { isValidSprInput } from "@/engine/grade";
import { cn } from "@/lib/utils";
import type { PublicQuestion } from "@/server/questions";
import { DOMAINS, SKILL_BY_ID, type DomainId } from "@/content/taxonomy";

/** One question: passage, stem, and a choice radio group or SPR input. `correct` marks the answer after reveal. */
export function QuestionView({ question: q, value, onChange, disabled, correct, showMetadata = true, compact = false }: {
  question: PublicQuestion;
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
  showMetadata?: boolean;
  compact?: boolean;
  correct?: string | null; // choice letter, once revealed (MCQ only)
}) {
  return (
    <div className={cn("question-content grid w-full min-w-0 gap-6", !compact && "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10")}>
      <section aria-label="Question" className={cn("flex min-w-0 flex-col gap-4", !compact && "md:border-r md:pr-8")}>
        {showMetadata && <div aria-label="Question details" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Domain: {DOMAINS[q.domain as DomainId]?.name ?? q.domain}</span>
          <span>Skill: {SKILL_BY_ID[q.skillId]?.name ?? q.skillId}</span>
          <span>SAT difficulty: {q.difficulty === 1 ? "Easy" : q.difficulty === 2 ? "Medium" : q.difficulty === 3 ? "Hard" : "Unrated"}</span>
        </div>}
        {q.passageMd && <Markdown className="text-base">{q.passageMd}</Markdown>}
        <Markdown className="text-[15px]">{q.stemMd}</Markdown>
      </section>
      <section aria-label="Your answer" className="flex min-w-0 flex-col gap-4">
        <h2 className="text-sm font-medium">{q.choices?.length ? "Choose an answer" : "Enter your answer"}</h2>
        {q.choices?.length ? (
          <div role="radiogroup" aria-label="Answer choices" className="flex flex-col gap-2">
            {q.choices!.map((c, index) => {
              const chosen = value === c.id;
              const isRight = correct != null && c.id === correct;
              const isWrong = correct != null && chosen && !isRight;
              return (
                <button key={c.id} type="button" role="radio" aria-checked={chosen} disabled={disabled}
                  tabIndex={disabled ? -1 : value === c.id || (value == null && index === 0) ? 0 : -1}
                  onKeyDown={(event) => {
                    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
                    if (!step || disabled) return;
                    event.preventDefault(); event.stopPropagation();
                    const next = (index + step + q.choices!.length) % q.choices!.length;
                    onChange(q.choices![next]!.id);
                    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button[role=radio]")[next]?.focus();
                  }}
                  onClick={() => onChange(c.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    !disabled && "hover:bg-muted",
                    chosen && "border-primary ring-1 ring-primary",
                    isRight && "border-neutral-600 bg-neutral-50 dark:bg-neutral-950/40",
                    isWrong && "border-red-600 bg-red-50 dark:bg-red-950/40",
                  )}>
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                    chosen && "bg-primary text-primary-foreground")}>{c.id}</span>
                  <Markdown className="min-w-0 flex-1">{c.md}</Markdown>
                  {isRight && <Check className="size-5 text-neutral-700" aria-label="Correct answer" />}
                  {isWrong && <X className="size-5 text-red-700" aria-label="Your answer" />}
                </button>
              );
            })}
          </div>
        ) : (
          <label className="flex flex-col gap-1 text-sm">
            Your answer
            {/* No inputMode="decimal": phone number pads have no "/" (and iOS no "-"), so fractions couldn't be typed. */}
            <input autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} disabled={disabled} value={value ?? ""}
              onChange={(e) => { const v = e.target.value.replace(/\s/g, ""); if (isValidSprInput(v)) onChange(v || null); }}
              className="h-11 w-40 rounded-md border bg-background px-3 font-mono text-lg" />
            <span className="text-xs text-muted-foreground">Fractions or decimals. Enter 3 1/2 as 7/2 or 3.5.</span>
          </label>
        )}
      </section>
    </div>
  );
}
