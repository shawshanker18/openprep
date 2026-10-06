"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator, Expand, LoaderCircle, Minimize } from "lucide-react";
import { watchCalculatorSize } from "@/lib/calculator-size";
import { Button } from "@/components/ui/button";

type DesmosApi = {
  setExpression(expression: { id: string; latex: string }): void;
  resize(): void;
  destroy(): void;
};
declare global {
  interface Window {
    Desmos?: { GraphingCalculator(element: HTMLElement, options?: Record<string, unknown>): DesmosApi };
  }
}

const EMPTY_EXPRESSIONS: string[] = [];
const FALLBACK = "https://www.desmos.com/calculator";
const API_KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY;
let loading: Promise<void> | null = null;

function loadDesmos(): Promise<void> {
  if (window.Desmos) return Promise.resolve();
  if (!API_KEY) return Promise.reject(new Error("Desmos API key is not configured"));
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${encodeURIComponent(API_KEY)}`;
    const fail = () => { loading = null; script.remove(); reject(new Error("Desmos could not load")); };
    script.onload = () => { if (window.Desmos) resolve(); else fail(); };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}

/** Desmos calculator with a hosted embed when the API key is unavailable. */
export function DesmosCalculator({ expressions = EMPTY_EXPRESSIONS, className = "h-96" }: { expressions?: string[]; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const sizing = useRef<ReturnType<typeof watchCalculatorSize>|null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [fullscreen, setFullscreen] = useState(false);
  const expressionKey = JSON.stringify(expressions);
  useEffect(() => {
    let cancelled = false, scriptReady = false, timedOut = false;
    const target = el.current;
    const host = viewport.current;
    if (!target || !host || !API_KEY) return;
    let calculator: DesmosApi | null = null;
    const fail = () => { if (!cancelled) { timedOut = true; setState("error"); } };
    const timeout = window.setTimeout(fail, 15_000);
    const watcher = watchCalculatorSize(host, () => {
      if (cancelled || timedOut || !scriptReady || !window.Desmos) return;
      try {
        if (!calculator) {
          calculator = window.Desmos.GraphingCalculator(target, { autosize: false });
          (JSON.parse(expressionKey) as string[]).forEach((latex, index) =>
            calculator!.setExpression({ id: `lesson-${index}`, latex }));
        }
        calculator.resize();
        window.clearTimeout(timeout);
        setState("ready");
      } catch { fail(); }
    });
    sizing.current = watcher;
    loadDesmos().then(() => {
      if (cancelled || timedOut) return;
      scriptReady = true;
      watcher.refresh();
    }, fail);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      watcher.disconnect();
      if (sizing.current === watcher) sizing.current = null;
      calculator?.destroy();
      target.replaceChildren();
    };
  }, [expressionKey]);
  useEffect(() => {
    sizing.current?.refresh();
    if (!fullscreen) return;
    const original = document.body.style.overflow;
    const previousFocus=document.activeElement as HTMLElement|null;
    const inertSiblings:{element:HTMLElement;before:boolean}[]=[];
    let current:HTMLElement|null=shell.current;
    while(current && current!==document.body){
      for(const child of current.parentElement?.children??[]){
        if(child!==current && child instanceof HTMLElement){inertSiblings.push({element:child,before:child.inert});child.setAttribute('inert','');}
      }
      current=current.parentElement;
    }
    document.body.style.overflow = "hidden";
    shell.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setFullscreen(false); };
    document.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = original; document.removeEventListener("keydown", escape); inertSiblings.forEach(({element,before})=>{element.toggleAttribute('inert',before);});previousFocus?.focus(); };
  }, [fullscreen]);
  if (!API_KEY || state === "error") {
    return (
      <div ref={shell} role={fullscreen ? "dialog" : undefined} aria-modal={fullscreen || undefined} aria-label="Graphing calculator" className={fullscreen ? "fixed inset-0 z-50 flex flex-col gap-2 bg-background p-4" : `relative flex min-h-[320px] min-w-[280px] max-w-full resize flex-col gap-2 overflow-auto ${className}`} title="Drag the bottom-right corner to resize">
        <button type="button" className="absolute right-3 top-3 z-20 rounded-md border bg-background p-2 hover:bg-muted" onClick={() => setFullscreen((v) => !v)} aria-label={fullscreen ? "Exit full-screen calculator" : "Open full-screen calculator"}>
          {fullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}
        </button>
        <iframe title="Desmos graphing calculator" src={FALLBACK} className="min-h-0 flex-1 w-full rounded-md border" allowFullScreen />
        <p className="text-xs text-muted-foreground">If the embedded calculator is blocked, <a className="underline" href={FALLBACK} target="_blank" rel="noopener noreferrer">open Desmos</a>.
          {expressions.length > 0 && <> Enter: {expressions.map((e) => <code key={e} className="mx-1 rounded bg-muted px-1">{e}</code>)}</>}</p>
      </div>
    );
  }
  return <div ref={shell} role={fullscreen ? "dialog" : undefined} aria-modal={fullscreen || undefined} aria-label="Graphing calculator" className={fullscreen ? "fixed inset-0 z-50 flex flex-col bg-background p-4" : `relative flex min-h-[320px] min-w-[280px] max-w-full resize flex-col overflow-hidden rounded-md border ${className}`} title="Drag the bottom-right corner to resize">
    <button type="button" className="absolute right-3 top-3 z-20 rounded-md border bg-background p-2 hover:bg-muted" onClick={() => setFullscreen((v) => !v)} aria-label={fullscreen ? "Exit full-screen calculator" : "Open full-screen calculator"}>
      {fullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}
    </button>
    {state === "loading" && <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading calculator…</div>}
    <div ref={viewport} className="relative min-h-0 min-w-0 w-full flex-1 overflow-hidden">
      <div ref={el} className="absolute inset-0" />
    </div>
  </div>;
}

/** Toggleable calculator for practice and test modules; starts empty so it doesn't give the method away. */
export function DesmosToggle({ className = "h-[65vh] min-h-[24rem]" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <Button variant="outline" size="sm" className="self-start" onClick={() => { setMounted(true); setOpen((o) => !o); }} aria-expanded={open}>
        <Calculator /> {open ? "Hide calculator" : "Calculator"}
      </Button>
      {mounted && <div hidden={!open}><DesmosCalculator className={className} /></div>}
    </div>
  );
}
