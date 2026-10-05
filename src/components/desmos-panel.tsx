"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Calculator, Expand, LoaderCircle, Minimize } from "lucide-react";
import { watchCalculatorSize } from "@/lib/calculator-size";
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
    s.onload = () => {
      if(window.GGBApplet) resolve();
      else {loading=null;s.remove();reject(new Error("geogebra"));}
    };
    s.onerror = () => { loading = null; s.remove(); reject(new Error("geogebra")); };
    document.head.appendChild(s);
  });
  return loading;
}

/** Inline GeoGebra graphing calculator with a Desmos-like surrounding layout and controls. */
export function DesmosCalculator({ expressions = EMPTY_EXPRESSIONS, className = "h-96" }: { expressions?: string[]; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const sizing = useRef<ReturnType<typeof watchCalculatorSize>|null>(null);
  const id = useId().replace(/:/g, "");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [fullscreen, setFullscreen] = useState(false);
  const expressionKey = JSON.stringify(expressions);
  useEffect(() => {
    let cancelled=false, scriptReady=false, injected=false, timedOut=false;
    const target=el.current;
    const host=viewport.current;
    if(!target || !host) return;
    let apiInstance:GeoGebraApi|null=null;
    let parameters:Record<string,unknown>|null=null;
    let timeout:number|null=null;
    const fail=()=>{if(!cancelled){timedOut=true;setState("error");}};
    // The host is observed before injection, so hidden panels never initialize at an invented size.
    // GeoGebra writes inline dimensions to its injection target. Measure a separate
    // layout-owned viewport so its previous size cannot freeze the next measurement.
    const watcher=watchCalculatorSize(host,(width,height)=>{
      if(cancelled || timedOut) return;
      if(parameters) {parameters.width=width;parameters.height=height;}
      if(apiInstance) {
        apiInstance.setSize(width,height);
        setState("ready");
      } else if(scriptReady && !injected && window.GGBApplet) {
        injected=true;
        timeout=window.setTimeout(fail,20_000);
        parameters={
          id, appName:"graphing", width, height, showToolBar:false, showAlgebraInput:true, showMenuBar:false,
          // Resize the actual views rather than scaling an old canvas to fit the page.
          disableAutoScale:true, autoHeight:false, preventFocus:true,
          showResetIcon:true, showZoomButtons:true, enableLabelDrags:false, enableShiftDragZoom:true,
          appletOnLoad:(api:GeoGebraApi)=>{
            if(cancelled || timedOut){api.remove();return;}
            apiInstance=api;
            if(timeout!==null) window.clearTimeout(timeout);
            (JSON.parse(expressionKey) as string[]).forEach(expression=>api.evalCommand(expression));
            // GeoGebra's callback can run before its canvas layout is painted. Re-measure over two frames.
            watcher.refresh();
          },
        };
        const applet=new window.GGBApplet(parameters,true);
        applet.inject(id);
      }
    });
    sizing.current=watcher;
    timeout=window.setTimeout(fail,15_000);
    loadGeoGebra().then(()=>{
      if(cancelled || timedOut) return;
      if(timeout!==null) window.clearTimeout(timeout);
      scriptReady=true;watcher.refresh();
    },fail);
    return ()=>{
      cancelled=true;
      if(timeout!==null) window.clearTimeout(timeout);
      watcher.disconnect();
      if(sizing.current===watcher) sizing.current=null;
      apiInstance?.remove();target.replaceChildren();
    };
  },[expressionKey,id]);
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
  return <div ref={shell} role={fullscreen ? "dialog" : undefined} aria-modal={fullscreen || undefined} aria-label="Graphing calculator" className={fullscreen ? "fixed inset-0 z-50 flex flex-col bg-background p-4" : `relative flex min-h-[320px] min-w-[280px] max-w-full resize flex-col overflow-hidden rounded-md border ${className}`} title="Drag the bottom-right corner to resize">
    <button type="button" className="absolute right-3 top-3 z-20 rounded-md border bg-background p-2 hover:bg-muted" onClick={() => setFullscreen((v) => !v)} aria-label={fullscreen ? "Exit full-screen calculator" : "Open full-screen calculator"}>
      {fullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}
    </button>
    {state === "loading" && <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading calculator…</div>}
    <div ref={viewport} className="relative min-h-0 min-w-0 w-full flex-1 overflow-hidden">
      <div ref={el} id={id} className="absolute inset-0" />
    </div>
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
