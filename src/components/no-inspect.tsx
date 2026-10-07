"use client";

import { useEffect } from "react";

// Deterrent only: blocks right click and developer-tool shortcuts throughout the site.
// Browser menus can still open DevTools; the real protection is on the server (sign-in, opaque ids, answers only
// after answering, rate limits). The desktop and Android apps disable devtools for real.
const BLOCKED = new Set(["ctrl+shift+i", "ctrl+shift+j", "ctrl+shift+c", "ctrl+shift+k", "ctrl+u", "alt+meta+i", "alt+meta+j", "alt+meta+c", "meta+u"]);

export function NoInspect() {
  useEffect(() => {
    const menu = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); };
    const key = (e: KeyboardEvent) => {
      const combo = [e.ctrlKey && "ctrl", e.altKey && "alt", e.shiftKey && "shift", e.metaKey && "meta", e.key.toLowerCase()].filter(Boolean).join("+");
      if (e.key.toLowerCase() === "f12" || e.code === "F12" || BLOCKED.has(combo)) {
        e.preventDefault(); e.stopPropagation();
      }
    };
    document.addEventListener("contextmenu", menu, true);
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("contextmenu", menu, true);
      document.removeEventListener("keydown", key, true);
    };
  }, []);
  return null;
}
