"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator, ChartLine, Expand, ExternalLink, LoaderCircle, Maximize2, Minimize, Minimize2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { getCalculatorLayout, saveCalculatorLayout } from "@/app/calculator-actions";
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
    Desmos?: { GraphingCalculator(element: HTMLElement, options?: Record<string, unknown>): DesmosApi; ScientificCalculator(element: HTMLElement, options?: Record<string, unknown>): DesmosApi };
  }
}

const EMPTY_EXPRESSIONS: string[] = [];
const FALLBACK = "https://www.desmos.com/testing/collegeboard/graphing";
const FALLBACK_SCIENTIFIC = "https://www.desmos.com/testing/collegeboard/scientific";
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
export function DesmosCalculator({ expressions = EMPTY_EXPRESSIONS, className = "h-96", stateKey, kind = "graphing", bare = false }: { expressions?: string[]; className?: string; stateKey?: string; kind?: "graphing" | "scientific"; bare?: boolean }) {
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
          calculator = kind === "scientific"
            ? window.Desmos.ScientificCalculator(target, {})
            : window.Desmos.GraphingCalculator(target, { autosize: false, expressions: true, settingsMenu: false });
          if (kind === "graphing") (JSON.parse(expressionKey) as string[]).forEach((latex, index) =>
            calculator!.setExpression({ id: `lesson-${index}`, latex }));
          // Graphs the student drew earlier in this session come back as they left them.
          if (stateKey && kind === "graphing") {
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
  }, [expressionKey, stateKey, kind]);
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
      className={fullscreen ? "fixed inset-0 z-50 flex flex-col bg-white" : `relative flex ${bare ? "" : "min-h-[320px]"} min-w-0 max-w-full flex-col overflow-hidden border border-neutral-300 bg-white ${className}`}>
      {!bare && <div className="absolute right-3 bottom-3 z-20 flex items-center gap-2">
        <a href={FALLBACK} target="_blank" rel="noopener noreferrer" onClick={openInWindow} className={CONTROL}>
          <ExternalLink className="size-4" />New window
        </a>
        <button type="button" className={CONTROL} onClick={() => setFullscreen((value) => !value)}
          aria-label={fullscreen ? "Exit full-screen calculator" : "Open full-screen calculator"}>
          {fullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}{fullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>}
      {hosted ? (
        <>
          <div className="relative min-h-0 w-full flex-1 overflow-hidden"><iframe title="Desmos graphing calculator" src={kind === "scientific" ? FALLBACK_SCIENTIFIC : FALLBACK} className="absolute -top-[54px] left-0 h-[calc(100%+54px)] w-full border-0" allowFullScreen /></div>
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
 * The test-day calculator: a top-bar button that opens the same floating Bluebook-style window the question bank uses.
 * It stays mounted after the first open, so graphs, position and size are still there between questions and when reopened.
 */
export function DesmosDock({ sessionKey }: { sessionKey: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => { setMounted(true); setOpen((o) => !o); }}
        className="flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted"><Calculator className="size-4" />Calculator</button>
      {mounted && <FloatingDesmos sessionKey={sessionKey} open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

type Tab = "graphing" | "scientific";
type Saved = { w: number; tab: Tab };
const MIN_W = 300;
const maxWidth = () => Math.max(MIN_W, window.innerWidth - 24);
const fitSaved = (v: { w?: number; tab?: string }): Saved => ({
  w: Math.min(Math.max(MIN_W, Number.isFinite(v.w) ? (v.w as number) : 560), maxWidth()),
  tab: v.tab === "scientific" ? "scientific" : "graphing",
});

/**
 * The calculator: a rounded panel that slides in from the left edge, with Graphing and Scientific tabs, collapse to
 * full width, close, and a handle on its right edge to resize. It is created once per practice or test session and only
 * slid out of view when closed, so its graphs and width survive moving between questions. The width and tab start from
 * this browser's last choice for the session, otherwise the student's saved default from the database, otherwise 560 px.
 * After that it never asks the database again; only "Save as default" writes to it.
 */
export function FloatingDesmos({ sessionKey, open, onClose }: { sessionKey: string; open: boolean; onClose: () => void }) {
  const winKey = `${sessionKey}:window`;
  const [start, setStart] = useState<Saved | null>(() => {
    try { const saved = localStorage.getItem(winKey); return saved ? fitSaved(JSON.parse(saved)) : null; } catch { return null; }
  });
  useEffect(() => {
    if (start) return;
    let off = false;
    getCalculatorLayout().then((saved) => fitSaved(saved ?? {}), () => fitSaved({}))
      .then((layout) => { if (!off) setStart(layout); });
    return () => { off = true; };
  }, [start]);
  if (!start) return null;
  return <CalculatorWindow key="w" winKey={winKey} sessionKey={sessionKey} initial={start} open={open} onClose={onClose} />;
}

function CalculatorWindow({ winKey, sessionKey, initial, open, onClose }: { winKey: string; sessionKey: string; initial: Saved; open: boolean; onClose: () => void }) {
  const [width, setWidth] = useState(initial.w);
  const [tab, setTab] = useState<Tab>(initial.tab);
  const [scientificSeen, setScientificSeen] = useState(initial.tab === "scientific");
  const [wide, setWide] = useState(false);
  const [saving, setSaving] = useState(false);
  const sizing = useRef<{ sx: number; start: number } | null>(null);
  const remember = (w: number, t: Tab = tab) => { try { localStorage.setItem(winKey, JSON.stringify({ w, tab: t })); } catch { /* storage unavailable */ } };
  const pick = (t: Tab) => { setTab(t); if (t === "scientific") setScientificSeen(true); remember(width, t); };
  const saveDefault = async () => {
    setSaving(true);
    try {
      // x, y and h are kept in the stored shape for layouts saved by the earlier floating window.
      const res = await saveCalculatorLayout({ x: 12, y: 76, w: width, h: 545, tab });
      if (res.ok) toast.success("Saved as your default calculator layout"); else toast.error("Couldn't save the layout. Try again.");
    } catch { toast.error("Couldn't save the layout. Check your connection and try again."); }
    finally { setSaving(false); }
  };
  const tabBtn = (t: Tab, label: string, Icon: typeof Calculator) => (
    <button type="button" role="tab" aria-selected={tab === t} onClick={() => pick(t)}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${tab === t ? "bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-300 [&>span]:underline [&>span]:underline-offset-4" : "text-neutral-700 hover:bg-neutral-200"}`}>
      <Icon className="size-3.5" /><span>{label}</span>
    </button>
  );
  const icon = "grid size-8 place-items-center rounded-lg text-neutral-800 hover:bg-neutral-200 disabled:opacity-50";
  return (
    <div aria-hidden={!open} inert={!open}
      style={{ width: wide ? "calc(100vw - 24px)" : width }}
      className={`fixed bottom-3 left-3 top-[76px] z-50 flex min-w-[300px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-neutral-300 bg-white text-neutral-900 shadow-2xl transition-[transform,opacity,visibility] duration-300 ease-out ${open ? "translate-x-0 opacity-100" : "pointer-events-none invisible -translate-x-[calc(100%+24px)] opacity-0"}`}>
      <div className="flex shrink-0 select-none items-center gap-2 border-b border-neutral-200 bg-neutral-100 px-2.5 py-2">
        <div role="tablist" aria-label="Calculator type" className="flex shrink-0 gap-0.5 rounded-xl bg-neutral-200/70 p-0.5">
          {tabBtn("graphing", "Graphing", ChartLine)}{tabBtn("scientific", "Scientific", Calculator)}
        </div>
        <div className="ml-auto flex shrink-0 items-center">
          <button type="button" disabled={saving} onClick={saveDefault} aria-label="Save as default calculator layout" title="Save width and calculator as my default" className={icon}><Save className="size-4" /></button>
          <button type="button" onClick={() => setWide((v) => !v)} aria-label={wide ? "Shrink calculator" : "Expand calculator"} title={wide ? "Shrink" : "Expand"} className={icon}>{wide ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</button>
          <button type="button" onClick={onClose} aria-label="Close calculator" title="Close" className={icon}><X className="size-5" /></button>
        </div>
      </div>
      {!wide && <div aria-hidden title="Drag to resize" className="absolute inset-y-0 right-0 z-30 w-2 cursor-ew-resize touch-none"
        onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); sizing.current = { sx: e.clientX, start: width }; }}
        onPointerMove={(e) => { const r = sizing.current; if (r) setWidth(Math.min(maxWidth(), Math.max(MIN_W, r.start + e.clientX - r.sx))); }}
        onPointerUp={() => { if (sizing.current) { sizing.current = null; remember(width); } }} />}
      <div className="flex min-h-0 flex-1 flex-col">
        <div hidden={tab !== "graphing"} className="flex min-h-0 flex-1 flex-col"><DesmosCalculator bare stateKey={`${sessionKey}:graph`} className="min-h-0 flex-1 border-0" /></div>
        {scientificSeen && <div hidden={tab !== "scientific"} className="flex min-h-0 flex-1 flex-col"><DesmosCalculator bare kind="scientific" className="min-h-0 flex-1 border-0" /></div>}
      </div>
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
