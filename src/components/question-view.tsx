"use client";

import { useRef, useState } from "react";
import { Bookmark, Check, X } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { isValidSprInput } from "@/engine/grade";
import { cn } from "@/lib/utils";
import type { PublicQuestion } from "@/server/questions";
import { DOMAINS, SKILL_BY_ID, type DomainId } from "@/content/taxonomy";

/**
 * One question laid out like the real digital SAT: the passage (or the maths problem) on the left, the question number,
 * "Mark for Review", the answer-elimination toggle and the choices on the right, with a draggable divider between them.
 * On a narrow screen the two sides stack. `fill` makes each side scroll inside the space it is given (exam screens);
 * without it the question simply takes the height it needs. `correct` marks the right answer after it is revealed.
 */
export function QuestionView({ question: q, value, onChange, disabled, correct, showMetadata = true, compact = false, large = false, fill = false,
  number, marked, onMark, eliminated, onEliminate, below }: {
  question: PublicQuestion;
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
  showMetadata?: boolean;
  compact?: boolean;
  /** Bigger reading text for focused, full-screen runs such as the diagnostic. */
  large?: boolean;
  fill?: boolean;
  correct?: string | null; // choice letter, once revealed (MCQ only)
  /** Question number shown in the black box, and the Mark for Review control (only shown when `onMark` is given). */
  number?: number;
  marked?: boolean;
  onMark?: () => void;
  /** Crossed-out choice letters. Controlled by the caller so they survive moving between questions. */
  eliminated?: string[];
  onEliminate?: (next: string[]) => void;
  /** Extra content under the choices, on the answer side (the explanation after an answer is revealed). */
  below?: React.ReactNode;
}) {
  const hasPassage = !!q.passageMd;
  const [split, setSplit] = useState(50);
  const [showElim, setShowElim] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);
  const text = large ? "text-xl" : "text-[15px]";
  const struck = new Set(eliminated ?? []);
  const canEliminate = !!onEliminate && !!q.choices?.length && !disabled;

  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 || !wrap.current) return;
    const box = wrap.current.getBoundingClientRect();
    setSplit(Math.min(75, Math.max(25, ((e.clientX - box.left) / box.width) * 100)));
  };

  const left = (
    <div className={cn("flex min-w-0 flex-col gap-4", fill && "split:overflow-y-auto split:p-4")}>
      {showMetadata && <div aria-label="Question details" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Domain: {DOMAINS[q.domain as DomainId]?.name ?? q.domain}</span>
        <span>Skill: {SKILL_BY_ID[q.skillId]?.name ?? q.skillId}</span>
        <span>SAT difficulty: {q.difficulty === 1 ? "Easy" : q.difficulty === 2 ? "Medium" : q.difficulty === 3 ? "Hard" : "Unrated"}</span>
      </div>}
      <Markdown className={cn(text, "font-serif leading-relaxed")}>{hasPassage ? q.passageMd! : q.stemMd}</Markdown>
    </div>
  );

  const right = (
    <div className={cn("flex min-w-0 flex-col gap-4", fill && "split:overflow-y-auto split:p-4")}>
      {(number != null || onMark || canEliminate) && (
        <div className="flex items-center gap-3 bg-muted px-3 py-1.5 text-sm">
          {number != null && <span className="rounded-sm bg-foreground px-2.5 py-1 text-base font-bold leading-none text-background tabular-nums">{number}</span>}
          {onMark && (
            <button type="button" onClick={onMark} aria-pressed={!!marked} disabled={disabled}
              className="flex min-h-9 items-center gap-1.5 rounded-md px-1.5 hover:bg-background/60">
              <Bookmark className={cn("size-4", marked && "fill-current text-red-600")} />{marked ? "Marked for Review" : "Mark for Review"}
            </button>
          )}
          {canEliminate && (
            <button type="button" onClick={() => setShowElim((v) => !v)} aria-pressed={showElim} aria-label="Cross out answer choices"
              title="Cross out answer choices" className={cn("ml-auto flex h-8 items-center rounded-md border px-2 text-xs font-bold line-through", showElim ? "bg-foreground text-background" : "bg-background")}>ABC</button>
          )}
        </div>
      )}
      {hasPassage && <Markdown className={cn(text, "font-medium")}>{q.stemMd}</Markdown>}
      {!hasPassage && !q.choices?.length && <p className="text-sm text-muted-foreground">Enter your answer below.</p>}
      {q.choices?.length ? (
        <div role="radiogroup" aria-label="Answer choices" className="flex flex-col gap-3">
          {q.choices!.map((c, index) => {
            const chosen = value === c.id;
            const isRight = correct != null && c.id === correct;
            const isWrong = correct != null && chosen && !isRight;
            const crossed = struck.has(c.id);
            return (
              <div key={c.id} className="flex items-center gap-2">
                <button type="button" role="radio" aria-checked={chosen} disabled={disabled}
                  tabIndex={disabled ? -1 : value === c.id || (value == null && index === 0) ? 0 : -1}
                  onKeyDown={(event) => {
                    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
                    if (!step || disabled) return;
                    event.preventDefault(); event.stopPropagation();
                    const next = (index + step + q.choices!.length) % q.choices!.length;
                    onChange(q.choices![next]!.id);
                    event.currentTarget.closest("[role=radiogroup]")?.querySelectorAll<HTMLButtonElement>("button[role=radio]")[next]?.focus();
                  }}
                  onClick={() => onChange(c.id)}
                  className={cn(
                    "flex min-h-12 [@media(max-height:34rem)]:min-h-10 min-w-0 flex-1 items-center gap-3 rounded-lg border-2 bg-background px-3 py-2 text-left transition-colors",
                    !disabled && "hover:border-foreground/50",
                    chosen && "border-foreground bg-muted",
                    isRight && "border-foreground bg-muted",
                    isWrong && "border-dashed border-foreground/60 bg-muted/50",
                    crossed && !chosen && "opacity-60",
                  )}>
                  <span className={cn("flex shrink-0 items-center justify-center rounded-full border-2 border-current font-semibold", large ? "size-9 text-base" : "size-7 text-sm",
                    chosen && "bg-foreground text-background")}>{c.id}</span>
                  <Markdown className={cn("min-w-0 flex-1", text, crossed && "line-through decoration-2")}>{c.md}</Markdown>
                  {isRight && <Check className="size-5 shrink-0 text-foreground" aria-label="Correct answer" />}
                  {isWrong && <X className="size-5 shrink-0 text-foreground" aria-label="Your answer" />}
                </button>
                {canEliminate && showElim && (
                  <button type="button" aria-pressed={crossed} aria-label={`${crossed ? "Restore" : "Cross out"} choice ${c.id}`}
                    onClick={() => onEliminate!(crossed ? [...struck].filter((x) => x !== c.id) : [...struck, c.id])}
                    className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold", crossed ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}>
                    <span className={crossed ? undefined : "line-through"}>{c.id}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          Your answer
          {/* No inputMode="decimal": phone number pads have no "/" (and iOS no "-"), so fractions couldn't be typed. */}
          <input autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} disabled={disabled} value={value ?? ""}
            onChange={(e) => { const v = e.target.value.replace(/\s/g, ""); if (isValidSprInput(v)) onChange(v || null); }}
            className={cn("rounded-md border-2 bg-background px-3 font-mono", large ? "h-14 w-56 text-2xl" : "h-11 w-40 text-lg")} />
          <span className="text-xs text-muted-foreground">Fractions or decimals. Enter 3 1/2 as 7/2 or 3.5.</span>
        </label>
      )}
      {below}
    </div>
  );

  if (compact) return <div className="question-content grid w-full min-w-0 gap-6">{left}{right}</div>;
  return (
    <div ref={wrap} style={{ "--split": `${split}%` } as React.CSSProperties}
      className={cn("question-content flex w-full min-w-0 flex-col gap-6 split:flex-row split:gap-0", fill && "min-h-0 flex-1")}>
      <div className={cn("min-w-0 split:shrink-0 split:grow-0 split:basis-[var(--split)]", fill ? "split:flex split:min-h-0 split:flex-col" : "split:pr-6")}>{left}</div>
      <div role="separator" aria-orientation="vertical" aria-label="Resize passage and question" aria-valuenow={Math.round(split)} aria-valuemin={25} aria-valuemax={75} tabIndex={0}
        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={drag}
        onKeyDown={(e) => { if (e.key === "ArrowLeft") setSplit((s) => Math.max(25, s - 3)); if (e.key === "ArrowRight") setSplit((s) => Math.min(75, s + 3)); }}
        className="group relative hidden w-4 shrink-0 cursor-col-resize touch-none items-stretch justify-center split:flex">
        <span className="w-0.5 bg-foreground/40 group-hover:bg-foreground" />
        <span aria-hidden className="absolute top-1/2 h-8 w-3 -translate-y-1/2 rounded-sm bg-foreground" />
      </div>
      <div className={cn("min-w-0 split:flex-1", fill ? "split:flex split:min-h-0 split:flex-col" : "split:pl-6")}>{right}</div>
    </div>
  );
}
