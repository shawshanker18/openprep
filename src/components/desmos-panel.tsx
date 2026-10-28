"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator, ChartLine, ChevronDown, ChevronUp, Expand, ExternalLink, GripHorizontal, LoaderCircle, Maximize2, Minimize, Minimize2, Save, X } from "lucide-react";
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
type Win = { x: number; y: number; w: number; h: number };
type Saved = Win & { tab: Tab };
const clampWin = (v: Win): Win => ({
  w: v.w, h: v.h,
  x: Math.min(Math.max(0, v.x), Math.max(0, window.innerWidth - 120)),
  y: Math.min(Math.max(0, v.y), Math.max(0, window.innerHeight - 48)),
});
/** Where Bluebook puts it: top-left, under the exam header, about half the width of the screen's question column. */
const bluebookLayout = (): Saved => {
  const w = Math.min(560, window.innerWidth - 32), h = Math.min(545, window.innerHeight - 100);
  return { x: Math.min(24, Math.max(0, window.innerWidth - w)), y: Math.min(76, Math.max(0, window.innerHeight - h - 8)), w, h, tab: "graphing" };
};
const fitSaved = (v: Saved): Saved => {
  const w = Math.min(Math.max(260, v.w), window.innerWidth), h = Math.min(Math.max(200, v.h), window.innerHeight);
  return { ...clampWin({ x: v.x, y: v.y, w, h }), tab: v.tab === "scientific" ? "scientific" : "graphing" };
};

/**
 * A Bluebook-style calculator window: Graphing and Scientific tabs, a grip to drag it by, collapse, expand and close, and
 * resize handles on every edge. It is created once per practice or test session and only hidden when closed, so its graphs
 * and its place on screen survive moving between questions. Where it starts is decided once, when it is first opened:
 * this browser's last position for the session, otherwise the student's saved default from the database, otherwise the
 * Bluebook layout. After that it never asks the database again; only "Save as default" writes to it.
 */
export function FloatingDesmos({ sessionKey, open, onClose }: { sessionKey: string; open: boolean; onClose: () => void }) {
  const winKey = `${sessionKey}:window`;
  const [start, setStart] = useState<Saved | null>(() => {
    try { const saved = localStorage.getItem(winKey); return saved ? fitSaved({ ...bluebookLayout(), ...JSON.parse(saved) }) : null; } catch { return null; }
  });
  useEffect(() => {
    if (start) return;
    let off = false;
    getCalculatorLayout().then((saved) => saved ? fitSaved({ ...bluebookLayout(), ...saved }) : bluebookLayout(), () => bluebookLayout())
      .then((layout) => { if (!off) setStart(layout); });
    return () => { off = true; };
  }, [start]);
  if (!start) return null;
  return <CalculatorWindow key="w" winKey={winKey} sessionKey={sessionKey} initial={start} open={open} onClose={onClose} />;
}

function CalculatorWindow({ winKey, sessionKey, initial, open, onClose }: { winKey: string; sessionKey: string; initial: Saved; open: boolean; onClose: () => void }) {
  const [win, setWin] = useState<Win>({ x: initial.x, y: initial.y, w: initial.w, h: initial.h });
  const [tab, setTab] = useState<Tab>(initial.tab);
  const [scientificSeen, setScientificSeen] = useState(initial.tab === "scientific");
  const [mode, setMode] = useState<"normal" | "max" | "min">("normal");
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const sizing = useRef<{ dir: string; sx: number; sy: number; start: Win } | null>(null);
  const remember = (v: Win, t: Tab = tab) => { try { localStorage.setItem(winKey, JSON.stringify({ ...v, tab: t })); } catch { /* storage unavailable */ } };
  const pick = (t: Tab) => { setTab(t); if (t === "scientific") setScientificSeen(true); remember(win, t); };
  const saveDefault = async () => {
    setSaving(true);
    try {
      const res = await saveCalculatorLayout({ ...win, tab });
      if (res.ok) toast.success("Saved as your default calculator layout"); else toast.error("Couldn't save the layout. Try again.");
    } catch { toast.error("Couldn't save the layout. Check your connection and try again."); }
    finally { setSaving(false); }
  };
  /** Edge and corner handles: each pointer move recomputes the box from where the drag began. */
  const resizeMove = (e: React.PointerEvent) => {
    const r = sizing.current; if (!r) return;
    const dx = e.clientX - r.sx, dy = e.clientY - r.sy, { start: o, dir } = r;
    const minW = 260, minH = 200;
    let { x, y, w, h } = o;
    if (dir.includes("e")) w = Math.max(minW, Math.min(o.w + dx, window.innerWidth - o.x));
    if (dir.includes("s")) h = Math.max(minH, Math.min(o.h + dy, window.innerHeight - o.y));
    if (dir.includes("w")) { w = Math.max(minW, Math.min(o.w - dx, o.x + o.w)); x = o.x + o.w - w; }
    if (dir.includes("n")) { h = Math.max(minH, Math.min(o.h - dy, o.y + o.h)); y = o.y + o.h - h; }
    setWin({ x, y, w, h });
  };
  const HANDLES: [string, string][] = [
    ["n", "inset-x-2 top-0 h-2 cursor-ns-resize"], ["s", "inset-x-2 bottom-0 h-2 cursor-ns-resize"],
    ["w", "inset-y-2 left-0 w-2 cursor-ew-resize"], ["e", "inset-y-2 right-0 w-2 cursor-ew-resize"],
    ["nw", "left-0 top-0 size-4 cursor-nwse-resize"], ["ne", "right-0 top-0 size-4 cursor-nesw-resize"],
    ["sw", "bottom-0 left-0 size-4 cursor-nesw-resize"], ["se", "bottom-0 right-0 size-5 cursor-nwse-resize"],
  ];
  const tabBtn = (t: Tab, label: string, Icon: typeof Calculator) => (
    <button type="button" role="tab" aria-selected={tab === t} onClick={() => pick(t)}
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold ${tab === t ? "bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-300 [&>span]:underline [&>span]:underline-offset-4" : "text-neutral-700 hover:bg-neutral-200"}`}>
      <Icon className="size-3.5" /><span>{label}</span>
    </button>
  );
  const icon = "grid size-8 place-items-center rounded text-neutral-800 hover:bg-neutral-200 disabled:opacity-50";
  return (
    <div aria-hidden={!open}
      style={mode === "max" ? { left: 16, top: 16, width: "calc(100vw - 32px)", height: "calc(100dvh - 32px)" } : mode === "min" ? { left: win.x, top: win.y, width: win.w } : { left: win.x, top: win.y, width: win.w, height: win.h }}
      className={`fixed z-50 flex min-w-[260px] max-w-[100vw] flex-col overflow-hidden border border-neutral-500 bg-white text-neutral-900 shadow-2xl ${open ? "" : "pointer-events-none invisible"}`}>
      <div className={`flex shrink-0 select-none items-center gap-2 border-b border-neutral-300 bg-neutral-100 px-2 py-1.5 ${mode === "max" ? "" : "cursor-grab touch-none active:cursor-grabbing"}`}
        onPointerDown={(e) => { if (mode === "max" || (e.target as HTMLElement).closest("button")) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y }; }}
        onPointerMove={(e) => { const d = drag.current; if (d) setWin((w) => clampWin({ ...w, x: e.clientX - d.dx, y: e.clientY - d.dy })); }}
        onPointerUp={() => { if (drag.current) { drag.current = null; setWin((w) => { remember(w); return w; }); } }}>
        <div role="tablist" aria-label="Calculator type" className="flex shrink-0 gap-0.5 rounded-md bg-neutral-200/70 p-0.5">
          {tabBtn("graphing", "Graphing", ChartLine)}{tabBtn("scientific", "Scientific", Calculator)}
        </div>
        <GripHorizontal aria-hidden className="mx-auto size-5 text-neutral-500" />
        <div className="flex shrink-0 items-center">
          <button type="button" disabled={saving} onClick={saveDefault} aria-label="Save as default calculator layout" title="Save position, size and calculator as my default" className={icon}><Save className="size-4" /></button>
          <button type="button" onClick={() => setMode((m) => (m === "min" ? "normal" : "min"))} aria-label={mode === "min" ? "Restore calculator" : "Collapse calculator"} title={mode === "min" ? "Restore" : "Collapse"} className={icon}>{mode === "min" ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}</button>
          <button type="button" onClick={() => setMode((m) => (m === "max" ? "normal" : "max"))} aria-label={mode === "max" ? "Shrink calculator" : "Expand calculator"} title={mode === "max" ? "Shrink" : "Expand"} className={icon}>{mode === "max" ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</button>
          <button type="button" onClick={onClose} aria-label="Close calculator" title="Close" className={icon}><X className="size-5" /></button>
        </div>
      </div>
      {mode === "normal" && HANDLES.map(([dir, cls]) => (
        <div key={dir} aria-hidden className={`absolute z-30 touch-none ${cls}`}
          onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); sizing.current = { dir, sx: e.clientX, sy: e.clientY, start: win }; }}
          onPointerMove={resizeMove}
          onPointerUp={() => { if (sizing.current) { sizing.current = null; setWin((w) => { remember(w); return w; }); } }}>
          {dir === "se" && <svg viewBox="0 0 20 20" className="absolute bottom-0.5 right-0.5 size-4 text-neutral-400"><path d="M18 8 8 18M18 13l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>}
        </div>
      ))}
      <div hidden={mode === "min"} className="flex min-h-0 flex-1 flex-col">
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
