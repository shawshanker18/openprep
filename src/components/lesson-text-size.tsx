"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Text sizes in pixels, smallest first. The default is the middle one, larger than the old fixed 15px lesson text. */
const SIZES = [17, 19, 21, 24, 27] as const;
const DEFAULT = 2;
const KEY = "openprep-lesson-text";

/** Lets a student make lesson text larger or smaller. The choice is remembered on this device; storage may be blocked. */
export function LessonTextSize({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(DEFAULT);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      const saved = raw === null ? NaN : Number(raw);
      if (Number.isInteger(saved) && saved >= 0 && saved < SIZES.length) queueMicrotask(() => setStep(saved));
    } catch { /* Storage can be blocked; the default size still works. */ }
  }, []);
  const change = (next: number) => {
    const clamped = Math.min(SIZES.length - 1, Math.max(0, next));
    setStep(clamped);
    try { window.localStorage.setItem(KEY, String(clamped)); } catch { /* Session-only preference. */ }
  };
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div role="group" aria-label="Text size" className="flex items-center justify-end gap-2 text-sm">
        <span className="text-muted-foreground">Text size</span>
        <Button variant="outline" size="sm" onClick={() => change(step - 1)} disabled={step === 0} aria-label="Smaller text">A−</Button>
        <Button variant="outline" size="sm" onClick={() => change(step + 1)} disabled={step === SIZES.length - 1} aria-label="Larger text">A+</Button>
      </div>
      <div className="min-w-0" style={{ fontSize: `${SIZES[step]}px` }}>{children}</div>
    </div>
  );
}
