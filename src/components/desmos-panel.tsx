"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator, Expand, ExternalLink, LoaderCircle, Minimize } from "lucide-react";
import { watchCalculatorSize } from "@/lib/calculator-size";
import { Markdown } from "@/components/markdown";
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
const FALLBACK = "https://www.desmos.com/testing/collegeboard/graphing";
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
          calculator = window.Desmos.GraphingCalculator(target, { autosize: false, expressions: true, settingsMenu: false });
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
  const hosted = !API_KEY || state === "error";
  return (
    <div ref={shell} role={fullscreen ? "dialog" : undefined} aria-modal={fullscreen || undefined}
      aria-label="Desmos graphing calculator"
      className={fullscreen ? "fixed inset-0 z-50 flex flex-col bg-white" : `relative flex min-h-[320px] min-w-0 max-w-full resize flex-col overflow-hidden border border-neutral-300 bg-white ${className}`}>
      <div className="absolute right-2 bottom-2 z-20 flex items-center gap-1 rounded-lg border bg-white/95 p-1 text-neutral-700">
        <div className="flex items-center gap-1">
          <a href={FALLBACK} target="_blank" rel="noopener noreferrer" className="rounded p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900" aria-label="Open Desmos in a new tab"><ExternalLink className="size-4" /></a>
          <button type="button" className="rounded p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            onClick={() => setFullscreen((value) => !value)} aria-label={fullscreen ? "Exit full-screen calculator" : "Open full-screen calculator"}>
            {fullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}
          </button>
        </div>
      </div>
      {hosted ? (
        <>
          <div className="relative min-h-0 w-full flex-1 overflow-hidden"><iframe title="Desmos graphing calculator" src={FALLBACK} className="absolute -top-[50px] left-0 h-[calc(100%+50px)] w-full border-0" allowFullScreen /></div>
          {expressions.length > 0 && <div className="shrink-0 border-t border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            Equations {expressions.map((expression) => <Markdown key={expression} className="mx-1 inline-block rounded bg-white px-2 py-1 text-neutral-900">{`$${expression}$`}</Markdown>)}
          </div>}
        </>
      ) : (
        <div ref={viewport} className="relative min-h-0 min-w-0 w-full flex-1 overflow-hidden">
          {state === "loading" && <div role="status" className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white text-sm text-neutral-600"><LoaderCircle className="size-4 animate-spin" /> Loading Desmos…</div>}
          <div ref={el} className="absolute inset-0" />
        </div>
      )}
    </div>
  );
}

/** Toggleable calculator for practice and test modules; starts empty so it doesn't give the method away. */
export function DesmosToggle({ className = "h-[65dvh] min-h-[20rem]" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <Button variant="outline" size="sm" className="self-start" onClick={() => { setMounted(true); setOpen((o) => !o); }} aria-expanded={open}>
        <Calculator /> {open ? "Hide Desmos" : "Desmos"}
      </Button>
      {mounted && <div hidden={!open}><DesmosCalculator className={className} /></div>}
    </div>
  );
}
