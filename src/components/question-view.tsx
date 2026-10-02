"use client";

import { Check, X } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { isValidSprInput } from "@/engine/grade";
import { cn } from "@/lib/utils";
import type { PublicQuestion } from "@/server/questions";

/** One question: passage, stem, and a choice radio group or SPR input. `correct` marks the answer after reveal. */
export function QuestionView({ question: q, value, onChange, disabled, correct }: {
  question: PublicQuestion;
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
  correct?: string | null; // choice letter, once revealed (MCQ only)
}) {
  return (
    <div className={cn("question-content grid gap-6", q.passageMd && "md:grid-cols-2")}>
      {q.passageMd && <Markdown className="rounded-lg bg-muted/50 p-4 text-[15px]">{q.passageMd}</Markdown>}
      <div className="flex flex-col gap-4">
        <Markdown className="text-[15px]">{q.stemMd}</Markdown>
        {q.type === "mcq" && q.choices ? (
          <div role="radiogroup" className="flex flex-col gap-2">
            {q.choices.map((c) => {
              const chosen = value === c.id;
              const isRight = correct != null && c.id === correct;
              const isWrong = correct != null && chosen && !isRight;
              return (
                <button key={c.id} type="button" role="radio" aria-checked={chosen} disabled={disabled}
                  onClick={() => onChange(c.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    !disabled && "hover:bg-muted",
                    chosen && "border-primary ring-1 ring-primary",
                    isRight && "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
                    isWrong && "border-red-600 bg-red-50 dark:bg-red-950/40",
                  )}>
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                    chosen && "bg-primary text-primary-foreground")}>{c.id}</span>
                  <Markdown className="flex-1">{c.md}</Markdown>
                  {isRight && <Check className="size-5 text-emerald-700" aria-label="Correct answer" />}
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
      </div>
    </div>
  );
}
