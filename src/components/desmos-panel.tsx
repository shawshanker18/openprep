"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Calculator, Expand, LoaderCircle, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";

type GeoGebraApi = { evalCommand(command: string): void; setSize(width: number, height: number): void; remove():void };
type GeoGebraApplet = { inject(target: string): void };
declare global { interface Window { GGBApplet?: new (opts: Record<string, unknown>, prereq: boolean) => GeoGebraApplet } }

const EMPTY_EXPRESSIONS: string[] = [];
const FALLBACK = "https://www.geogebra.org/graphing";
let loading: Promise<void> | null = null;

function loadGeoGebra(): Promise<void> {
  if (window.GGBApplet) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://www.geogebra.org/apps/deployggb.js";
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error("geogebra")); };
    document.head.appendChild(s);
  });
  return loading;
}

/** Inline GeoGebra graphing calculator with a Desmos-like surrounding layout and controls. */
export function DesmosCalculator({ expressions = EMPTY_EXPRESSIONS, className = "h-96" }: { expressions?: string[]; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [fullscreen, setFullscreen] = useState(false);
  const expressionKey = JSON.stringify(expressions);
  useEffect(() => {
    let cancelled = false;
    let timedOut = false;
    const target = el.current;
    const timeout = window.setTimeout(() => {
      if (!cancelled) { timedOut = true; setState("error"); }
    }, 15_000);
    let resizeObserver: ResizeObserver | null = null;
    let apiInstance:GeoGebraApi|null=null;
    loadGeoGebra().then(() => {
      if (cancelled || !el.current) return;
      if (window.GGBApplet) {
        const applet = new window.GGBApplet({
          id, appName: "graphing", width: 900, height: 500, showToolBar: false, showAlgebraInput: true, showMenuBar: false,
          showResetIcon: true, showZoomButtons: true, enableLabelDrags: false, enableShiftDragZoom: true,
          appletOnLoad: (api: GeoGebraApi) => {
            if (cancelled || timedOut) {api.remove();return;}
            apiInstance=api;
            window.clearTimeout(timeout);
            (JSON.parse(expressionKey) as string[]).forEach((expression) => api.evalCommand(expression));
            if (shell.current) {
              resizeObserver = new ResizeObserver(([entry]) => {
                if (!entry) return;
                const { width, height } = entry.contentRect;
                api.setSize(Math.max(280, Math.floor(width)), Math.max(320, Math.floor(height)));
              });
              resizeObserver.observe(shell.current);
              const { width, height } = shell.current.getBoundingClientRect();
              api.setSize(Math.max(280, Math.floor(width)), Math.max(320, Math.floor(height)));
            }
            if (!cancelled) setState("ready");
          },
        }, true);
        applet.inject(id);
      } else setState("error");
    }, () => { if (!cancelled) { window.clearTimeout(timeout); setState("error"); } });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      resizeObserver?.disconnect();
      apiInstance?.remove();
      target?.replaceChildren();
    };
  }, [expressionKey, id]);
  useEffect(() => {
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
  if (state === "error") {
    return (
      <div ref={shell} role={fullscreen ? "dialog" : undefined} aria-modal={fullscreen || undefined} aria-label="Graphing calculator" className={fullscreen ? "fixed inset-0 z-50 flex flex-col gap-2 bg-background p-4" : `relative flex min-h-[320px] min-w-[280px] max-w-full resize flex-col gap-2 overflow-auto ${className}`} title="Drag the bottom-right corner to resize">
        <button type="button" className="absolute right-3 top-3 z-20 rounded-md border bg-background p-2 hover:bg-muted" onClick={() => setFullscreen((v) => !v)} aria-label={fullscreen ? "Exit full-screen calculator" : "Open full-screen calculator"}>
          {fullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}
        </button>
        <iframe title="GeoGebra graphing calculator" src={`${FALLBACK}?embed=true`} className="min-h-0 flex-1 w-full rounded-md border" allowFullScreen />
        <p className="text-xs text-muted-foreground">If the embedded calculator is blocked, <a className="underline" href={FALLBACK} target="_blank" rel="noopener noreferrer">open GeoGebra</a>.
          {expressions.length > 0 && <> Enter: {expressions.map((e) => <code key={e} className="mx-1 rounded bg-muted px-1">{e}</code>)}</>}</p>
      </div>
    );
  }
  return <div ref={shell} role={fullscreen ? "dialog" : undefined} aria-modal={fullscreen || undefined} aria-label="Graphing calculator" className={fullscreen ? "fixed inset-0 z-50 flex flex-col bg-background p-4" : `relative min-h-[320px] min-w-[280px] max-w-full resize overflow-auto rounded-md border ${className}`} title="Drag the bottom-right corner to resize">
    <button type="button" className="absolute right-3 top-3 z-20 rounded-md border bg-background p-2 hover:bg-muted" onClick={() => setFullscreen((v) => !v)} aria-label={fullscreen ? "Exit full-screen calculator" : "Open full-screen calculator"}>
      {fullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}
    </button>
    {state === "loading" && <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading calculator…</div>}
    <div ref={el} id={id} className="h-full min-h-0 w-full overflow-hidden" />
  </div>;
}

/** Toggleable calculator for practice and test modules; starts empty so it doesn't give the method away. */
export function DesmosToggle({ className = "h-64" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" size="sm" className="self-start" onClick={() => { setMounted(true); setOpen((o) => !o); }} aria-expanded={open}>
        <Calculator /> {open ? "Hide calculator" : "Calculator"}
      </Button>
      {mounted && <div hidden={!open}><DesmosCalculator className={className} /></div>}
    </div>
  );
}
