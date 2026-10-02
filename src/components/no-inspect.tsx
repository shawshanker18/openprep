"use client";

import { useEffect } from "react";

// Deterrent only: blocks right click and the usual devtools / view source / save / print shortcuts.
// A browser's own menu can still open devtools; the real protection is server side (sign-in, one question at a
// time, rate limits). The desktop and Android apps disable devtools for real.
const BLOCKED = new Set(["ctrl+shift+i", "ctrl+shift+j", "ctrl+shift+c", "ctrl+shift+k", "ctrl+u", "ctrl+s", "ctrl+p", "alt+meta+i", "alt+meta+j", "alt+meta+c", "meta+u", "meta+s", "meta+p"]);

export function NoInspect() {
  useEffect(() => {
    const menu = (e: MouseEvent) => e.preventDefault();
    const key = (e: KeyboardEvent) => {
      const combo = [e.ctrlKey && "ctrl", e.altKey && "alt", e.shiftKey && "shift", e.metaKey && "meta", e.key.toLowerCase()].filter(Boolean).join("+");
      if (e.key === "F12" || BLOCKED.has(combo)) e.preventDefault();
    };
    document.addEventListener("contextmenu", menu);
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("contextmenu", menu); document.removeEventListener("keydown", key, true); };
  }, []);
  return null;
}
