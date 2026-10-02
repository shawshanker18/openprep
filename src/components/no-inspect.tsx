"use client";

import { useEffect, useState } from "react";
import { inNativeApp } from "@/lib/native";

// Deterrent only: blocks right click and the usual devtools / view source / save / print shortcuts, covers the page
// while DevTools looks open, and silences console output in production. A technical person can get around all of it;
// the real protection is server side (sign-in, opaque ids, one question at a time, rate limits). The desktop and
// Android apps disable devtools for real.
const BLOCKED = new Set(["ctrl+shift+i", "ctrl+shift+j", "ctrl+shift+c", "ctrl+shift+k", "ctrl+u", "ctrl+s", "ctrl+p", "alt+meta+i", "alt+meta+j", "alt+meta+c", "meta+u", "meta+s", "meta+p"]);
const DOCKED_GAP = 160; // px between the window and the page: a docked DevTools panel

export function NoInspect() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const menu = (e: MouseEvent) => e.preventDefault();
    const key = (e: KeyboardEvent) => {
      const combo = [e.ctrlKey && "ctrl", e.altKey && "alt", e.shiftKey && "shift", e.metaKey && "meta", e.key.toLowerCase()].filter(Boolean).join("+");
      if (e.key === "F12" || BLOCKED.has(combo)) e.preventDefault();
    };
    document.addEventListener("contextmenu", menu);
    document.addEventListener("keydown", key, true);

    if (process.env.NODE_ENV === "production") {
      const noop = () => {};
      Object.assign(console, { log: noop, debug: noop, info: noop, table: noop, dir: noop, dirxml: noop });
    }

    // DevTools detection: the apps have none to detect; touch devices' browser bars would look like a docked panel.
    const detect = !inNativeApp() && window.matchMedia("(pointer: fine)").matches;
    let lastSignal = 0;
    const docked = () => window.outerWidth - window.innerWidth > DOCKED_GAP || window.outerHeight - window.innerHeight > DOCKED_GAP;
    const check = () => setOpen(docked() || Date.now() - lastSignal < 4000);
    const signal = () => { lastSignal = Date.now(); setOpen(true); }; // from /devtools-guard.js (debugger timing)
    let timer: ReturnType<typeof setInterval> | undefined;
    let script: HTMLScriptElement | undefined;
    if (detect) {
      window.addEventListener("resize", check);
      window.addEventListener("openprep:devtools", signal);
      timer = setInterval(check, 2000);
      script = Object.assign(document.createElement("script"), { src: "/devtools-guard.js", async: true });
      document.head.appendChild(script);
      check();
    }
    return () => {
      document.removeEventListener("contextmenu", menu);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", check);
      window.removeEventListener("openprep:devtools", signal);
      clearInterval(timer);
      script?.remove();
    };
  }, []);

  if (!open) return null;
  // Covers the page instead of wiping it, so a student's test isn't lost; it lifts once DevTools is closed.
  return (
    <div role="alertdialog" aria-modal className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-6 text-center">
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-xl font-semibold">Developer tools are not allowed on this site</h1>
        <p className="text-sm text-muted-foreground">Close developer tools (or a side panel taking up the window) to continue.</p>
      </div>
    </div>
  );
}
