"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { PanelLeft, PanelLeftClose, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LessonWorkspace({
  title, slug, children, calculator,
}: { title: string; slug: string; children: ReactNode; calculator: ReactNode }) {
  const [navigation, setNavigation] = useState(false);
  const [calculatorSide, setCalculatorSide] = useState<"left" | "right">("right");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("openprep-calculator-side");
      if (saved === "left" || saved === "right") queueMicrotask(() => setCalculatorSide(saved));
    } catch { /* Browser storage can be blocked; the default layout remains usable. */ }
    document.body.classList.add("lesson-focus-mode");
    return () => document.body.classList.remove("lesson-focus-mode");
  }, []);

  const toggleNavigation = () => {
    setNavigation((open) => {
      document.body.classList.toggle("lesson-focus-mode", open);
      return !open;
    });
  };
  const setSide = (side: "left" | "right") => {
    setCalculatorSide(side);
    try { window.localStorage.setItem("openprep-calculator-side", side); } catch { /* Session-only preference. */ }
  };

  return (
    <div data-lesson={slug} className="lesson-workspace flex min-h-[calc(100vh-2rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="outline" size="sm" onClick={toggleNavigation} aria-pressed={navigation}>
            {navigation ? <PanelLeftClose /> : <PanelLeft />}
            {navigation ? "Hide navigation" : "Show navigation"}
          </Button>
          <h1 className="truncate text-xl font-semibold">{title}</h1>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1" aria-label="Calculator position">
          <Button variant={calculatorSide === "left" ? "secondary" : "ghost"} size="sm" onClick={() => setSide("left")} aria-pressed={calculatorSide === "left"} title="Calculator on the left"><PanelLeft /></Button>
          <Button variant={calculatorSide === "right" ? "secondary" : "ghost"} size="sm" onClick={() => setSide("right")} aria-pressed={calculatorSide === "right"} title="Calculator on the right"><PanelRight /></Button>
        </div>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 gap-0 overflow-hidden rounded-lg border lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className={`min-w-0 ${calculatorSide === "left" ? "lg:order-2" : "lg:order-1"}`}>
          <div className="p-5">
            <Link href="/desmos" className="mb-5 inline-block text-sm text-muted-foreground hover:underline">← Desmos lessons</Link>
            <div className="prose-op">{children}</div>
          </div>
        </section>
        <section className={`min-w-0 ${calculatorSide === "left" ? "lg:order-1" : "lg:order-2"}`}>
          <div className="sticky top-4">
            {calculator}
          </div>
        </section>
      </div>
    </div>
  );
}
