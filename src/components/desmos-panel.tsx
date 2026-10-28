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
  getState(): unknown;
  setState(state: unknown): void;
  observeEvent(event: string, callback: () => void): void;
};
declare global {
  interface Window {
    Desmos?: { GraphingCalculator(element: HTMLElement, options?: Record<string, unknown>): DesmosApi };
  }
}

const EMPTY_EXPRESSIONS: string[] = [];
const FALLBACK = "https://www.desmos.com/testing/collegeboard/graphing";
// The hosted page has a 50 px green header at every width. Crop a few pixels more so fractional display scaling
// (125%, 150%, 175%) never leaves a sliver of it showing along the top edge.
const API_KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY;
let loading: Promise<void> | null = null;
/** High-contrast on purpose: the calculator is white, so light-grey icons disappeared into it. */
const CONTROL = "inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white shadow-md hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
/** Open the calculator as its own window next to this one; if the browser blocks pop-ups the link opens a normal tab. */
function openInWindow(event: React.MouseEvent) {
  const popup = window.open(FALLBACK, "openprep-desmos", "popup=yes,width=1100,height=780");
  if (popup) { popup.opener = null; event.preventDefault(); }
}

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
export function DesmosCalculator({ expressions = EMPTY_EXPRESSIONS, className = "h-96", stateKey }: { expressions?: string[]; className?: string; stateKey?: string }) {
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
          // Graphs the student drew earlier in this session come back as they left them.
          if (stateKey) {
            try { const saved = localStorage.getItem(stateKey); if (saved) calculator.setState(JSON.parse(saved)); } catch { /* storage unavailable */ }
            let timer = 0;
            calculator.observeEvent("change", () => {
              window.clearTimeout(timer);
              timer = window.setTimeout(() => { try { localStorage.setItem(stateKey, JSON.stringify(calculator!.getState())); } catch { /* storage unavailable */ } }, 400);
            });
          }
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
  }, [expressionKey, stateKey]);
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
      className={fullscreen ? "fixed inset-0 z-50 flex flex-col bg-white" : `relative flex min-h-[320px] min-w-0 max-w-full flex-col overflow-hidden border border-neutral-300 bg-white ${className}`}>
      <div className="absolute right-3 bottom-3 z-20 flex items-center gap-2">
        <a href={FALLBACK} target="_blank" rel="noopener noreferrer" onClick={openInWindow} className={CONTROL}>
          <ExternalLink className="size-4" />New window
        </a>
        <button type="button" className={CONTROL} onClick={() => setFullscreen((value) => !value)}
          aria-label={fullscreen ? "Exit full-screen calculator" : "Open full-screen calculator"}>
          {fullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}{fullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>
      {hosted ? (
        <>
          <div className="relative min-h-0 w-full flex-1 overflow-hidden"><iframe title="Desmos graphing calculator" src={FALLBACK} className="absolute -top-[54px] left-0 h-[calc(100%+54px)] w-full border-0" allowFullScreen /></div>
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

/** A graph inside a lesson step, from a ```desmos block (one equation per line). Opens on click, so the page stays light. */
export function DesmosInline({ expressions, defaultOpen = false }: { expressions: string[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Button variant="outline" size="sm" className="self-start" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Calculator /> {open ? "Hide graph" : "Show graph in Desmos"}
      </Button>
      {open && <DesmosCalculator expressions={expressions} className="h-[22rem] min-h-[18rem]" />}
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

/**
 * The test-day calculator: a button for the top bar that slides a half-screen Desmos over the right side of the exam.
 * It stays mounted after the first open, so graphs are still there when it is reopened.
 */
export function DesmosDock() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => { setMounted(true); setOpen((o) => !o); }}
        className="flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted"><Calculator className="size-4" />Calculator</button>
      {mounted && (
        <div hidden={!open} className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l bg-white shadow-2xl sm:w-1/2">
          <div className="flex shrink-0 items-center justify-between bg-neutral-900 px-3 py-2 text-sm text-white">
            <span className="font-medium">Calculator</span>
            <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-md px-3 hover:bg-white/10">Close</button>
          </div>
          <DesmosCalculator className="min-h-0 flex-1 border-0" />
        </div>
      )}
    </>
  );
}

type Win = { x: number; y: number; w: number; h: number };
const clampWin = (v: Win): Win => ({
  w: v.w, h: v.h,
  x: Math.min(Math.max(0, v.x), Math.max(0, window.innerWidth - 120)),
  y: Math.min(Math.max(0, v.y), Math.max(0, window.innerHeight - 48)),
});

/**
 * A calculator window the student can drag by its title bar and resize from its corner. It is created once for a
 * practice session and only hidden when closed, so it is already loaded when opened, and its graphs and its place
 * on screen are kept for the whole session instead of resetting with each question.
 */
export function FloatingDesmos({ sessionKey, open, onClose }: { sessionKey: string; open: boolean; onClose: () => void }) {
  const winKey = `${sessionKey}:window`;
  const [win, setWin] = useState<Win>(() => {
    const fallback = { x: 16, y: Math.max(72, window.innerHeight - 460), w: Math.min(380, window.innerWidth - 32), h: 420 };
    try { const saved = localStorage.getItem(winKey); return saved ? clampWin({ ...fallback, ...JSON.parse(saved) }) : fallback; } catch { return fallback; }
  });
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const remember = (v: Win) => { try { localStorage.setItem(winKey, JSON.stringify(v)); } catch { /* storage unavailable */ } };
  // The browser's own corner handle resizes the box; read the new size back when the pointer is released.
  const settle = () => {
    const r = box.current?.getBoundingClientRect();
    if (r) setWin((w) => { const next = clampWin({ ...w, w: r.width, h: r.height }); remember(next); return next; });
  };
  return (
    <div ref={box} onPointerUp={settle} aria-hidden={!open}
      style={{ left: win.x, top: win.y, width: win.w, height: win.h, resize: "both" }}
      className={`fixed z-50 flex min-h-[260px] min-w-[260px] max-h-[95dvh] max-w-[95vw] flex-col overflow-hidden rounded-lg border bg-white shadow-2xl ${open ? "" : "pointer-events-none invisible"}`}>
      <div className="flex shrink-0 cursor-grab touch-none select-none items-center justify-between bg-neutral-900 px-3 py-2 text-sm text-white active:cursor-grabbing"
        onPointerDown={(e) => { if ((e.target as HTMLElement).closest("button")) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y }; }}
        onPointerMove={(e) => { const d = drag.current; if (d) setWin((w) => clampWin({ ...w, x: e.clientX - d.dx, y: e.clientY - d.dy })); }}
        onPointerUp={() => { if (drag.current) { drag.current = null; setWin((w) => { remember(w); return w; }); } }}>
        <span className="font-medium">Calculator · drag to move</span>
        <button type="button" onClick={onClose} className="min-h-8 rounded-md px-3 hover:bg-white/10">Close</button>
      </div>
      <DesmosCalculator stateKey={`${sessionKey}:graph`} className="min-h-0 flex-1 border-0" />
    </div>
  );
}

/** Top-bar button that opens and closes the floating calculator. */
export function CalculatorButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-expanded={open} onClick={onToggle}
      className="flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted"><Calculator className="size-4" />Calculator</button>
  );
}
