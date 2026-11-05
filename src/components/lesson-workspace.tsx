"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Calculator, PanelLeft, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingDesmos } from "@/components/desmos-panel";

export function LessonWorkspace({
  title, slug, children, calculator, expressions,
}: {
  title: string;
  slug: string;
  children: ReactNode;
  calculator?: ReactNode;
  expressions?: string[];
}) {
  const [navigation, setNavigation] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(true);

  useEffect(() => {
    document.body.classList.add("lesson-focus-mode");
    return () => document.body.classList.remove("lesson-focus-mode");
  }, []);

  // Keyboard shortcut 'd' / 'D' to toggle Desmos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) return;
        e.preventDefault();
        setCalculatorOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleNavigation = () => {
    setNavigation((open) => {
      document.body.classList.toggle("lesson-focus-mode", open);
      return !open;
    });
  };

  return (
    <div data-lesson={slug} className="lesson-workspace flex min-h-[calc(100dvh-2rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="outline" size="sm" onClick={toggleNavigation} aria-pressed={navigation}>
            {navigation ? <PanelLeftClose /> : <PanelLeft />}
            {navigation ? "Hide navigation" : "Show navigation"}
          </Button>
          <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={calculatorOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setCalculatorOpen((o) => !o)}
            aria-pressed={calculatorOpen}
            className="flex items-center gap-1.5 rounded-lg"
            title="Toggle Desmos Calculator (Shortcut: D)"
          >
            <Calculator className="size-4" />
            <span>Desmos</span>
            <kbd className="ml-1 rounded bg-muted/60 px-1 py-0.5 text-[10px] font-mono">D</kbd>
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-6">
        <div className="mx-auto w-full max-w-3xl">
          <Link href="/desmos" className="mb-5 inline-block text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            ← Desmos lessons
          </Link>
          <div className="prose-op">{children}</div>
        </div>
      </div>

      {/* Draggable & Resizable Floating Desmos Pop-in */}
      <FloatingDesmos
        sessionKey={`openprep:desmos:lesson:${slug}`}
        open={calculatorOpen}
        onOpen={() => setCalculatorOpen(true)}
        onClose={() => setCalculatorOpen(false)}
        expressions={expressions}
      />
    </div>
  );
}
