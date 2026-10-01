"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";

type Calc = { setExpression(e: { id: string; latex: string }): void; destroy(): void };
declare global { interface Window { Desmos?: { GraphingCalculator(el: HTMLElement, opts: object): Calc } } }

const KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY;
const FALLBACK = "https://www.desmos.com/calculator";
let loading: Promise<void> | null = null;

function loadDesmos(): Promise<void> {
  if (window.Desmos) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${KEY}`;
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error("desmos")); };
    document.head.appendChild(s);
  });
  return loading;
}

/** Inline Desmos graphing calculator (spec 04 §9). Without an API key it's a link to the public calculator. */
export function DesmosCalculator({ expressions = [], className = "h-96" }: { expressions?: string[]; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!KEY);
  useEffect(() => {
    if (!KEY) return;
    let calc: Calc | null = null, cancelled = false;
    loadDesmos().then(() => {
      if (cancelled || !el.current || !window.Desmos) return;
      calc = window.Desmos.GraphingCalculator(el.current, { expressions: true, settingsMenu: false });
      expressions.forEach((latex, i) => calc!.setExpression({ id: `e${i}`, latex }));
    }, () => setFailed(true));
    return () => { cancelled = true; calc?.destroy(); };
  }, [expressions]);
  if (failed) {
    return (
      <p className="rounded-md border p-3 text-sm">
        <a className="underline" href={FALLBACK} target="_blank" rel="noopener noreferrer">Open the Desmos graphing calculator</a>
        {expressions.length > 0 && <> and enter: {expressions.map((e) => <code key={e} className="mx-1 rounded bg-muted px-1">{e}</code>)}</>}
      </p>
    );
  }
  return <div ref={el} className={`w-full overflow-hidden rounded-md border ${className}`} />;
}

/** Toggleable calculator for practice and test modules; starts empty so it doesn't give the method away. */
export function DesmosToggle() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" size="sm" className="self-start" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Calculator /> {open ? "Hide calculator" : "Calculator"}
      </Button>
      {open && <DesmosCalculator />}
    </div>
  );
}
