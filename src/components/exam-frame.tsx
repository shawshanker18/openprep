"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The test-day screen, like the real digital SAT: a top bar (what you are doing, the timer, tools), the question
 * area in the middle, and a bottom bar (who you are, which question, Back / Next). It covers the whole window so there is
 * no site menu to wander off to. Used by the practice tests, the diagnostic and question-bank practice.
 */
export function ExamFrame({ top, footer, children }: { top: React.ReactNode; footer: React.ReactNode; children: React.ReactNode }) {
  // Page scroll is locked behind the exam screen.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b-2 border-dashed border-foreground/40 bg-muted px-4 py-2 text-foreground">{top}</header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 lg:overflow-hidden lg:px-6">{children}</main>
      <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-dashed border-foreground/40 bg-muted px-4 py-2 pb-[max(.5rem,env(safe-area-inset-bottom))]">{footer}</footer>
    </div>
  );
}

/** Top-bar pieces: title on the left, the timer centred, tools on the right. */
export function ExamTop({ title, subtitle, center, tools }: { title: string; subtitle?: string; center?: React.ReactNode; tools?: React.ReactNode }) {
  return (
    <>
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-base font-semibold leading-tight">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {center && <div className="order-last flex w-full justify-center sm:order-none sm:w-auto sm:flex-1">{center}</div>}
      <div className="flex flex-1 basis-40 flex-wrap items-center justify-end gap-2">{tools}</div>
    </>
  );
}

/** Countdown with the real test's "Hide / Show" control. */
export function ExamTimer({ label, urgent }: { label: string; urgent?: boolean }) {
  const [show, setShow] = useState(true);
  return (
    <div className="flex flex-col items-center leading-tight">
      <span className={cn("text-xl font-semibold tabular-nums", urgent && "text-red-500", !show && "invisible")} aria-live="off">{label}</span>
      <button type="button" onClick={() => setShow((v) => !v)} className="min-h-7 rounded-full border px-3 text-xs">{show ? "Hide" : "Show"}</button>
    </div>
  );
}

/** Bottom bar: name on the left, "Question n of N" (opens the question list) in the middle, Back and Next on the right. */
export function ExamFooter({ name, label, popup, onBack, onNext, backDisabled, nextLabel = "Next", nextDisabled, extra }: {
  name?: string; label: string; popup?: React.ReactNode; onBack?: () => void; onNext?: () => void; backDisabled?: boolean; nextLabel?: string; nextDisabled?: boolean; extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <>
      <p className="min-w-0 flex-1 basis-24 truncate text-sm font-semibold">{name}</p>
      <div ref={box} className="relative flex justify-center">
        <button type="button" onClick={() => popup && setOpen((v) => !v)} aria-expanded={popup ? open : undefined}
          className="flex min-h-10 items-center gap-1.5 rounded-md bg-foreground px-4 text-sm font-semibold text-background">
          {label}{popup && <ChevronUp className={cn("size-4 transition-transform", !open && "rotate-180")} />}
        </button>
        {popup && open && (
          <div className="absolute bottom-12 left-1/2 max-h-[min(60dvh,26rem)] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-xl border bg-background p-4 shadow-xl" onClick={(e) => { if ((e.target as HTMLElement).closest("[data-close]")) setOpen(false); }}>
            {popup}
          </div>
        )}
      </div>
      <div className="flex flex-1 basis-24 items-center justify-end gap-2">
        {extra}
        {onBack && <button type="button" onClick={onBack} disabled={backDisabled} className="min-h-10 rounded-full bg-foreground px-6 text-sm font-semibold text-background disabled:opacity-40">Back</button>}
        {onNext && <button type="button" onClick={onNext} disabled={nextDisabled} className="min-h-10 rounded-full bg-foreground px-6 text-sm font-semibold text-background disabled:opacity-40">{nextLabel}</button>}
      </div>
    </>
  );
}
