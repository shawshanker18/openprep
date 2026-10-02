"use client";

import { useEffect } from "react";

// Deterrent only: blocks right click and the usual devtools / view source / save / print shortcuts, and silences
// console output in production. A website can't stop someone opening DevTools from the browser menu, so nothing here
// ever gets in the way of using the site; the real protection is on the server (sign-in, opaque ids, answers only
// after answering, rate limits). The desktop and Android apps disable devtools for real.
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
    if (process.env.NODE_ENV === "production") {
      const noop = () => {};
      Object.assign(console, { log: noop, debug: noop, info: noop, table: noop, dir: noop, dirxml: noop });
    }
    return () => {
      document.removeEventListener("contextmenu", menu);
      document.removeEventListener("keydown", key, true);
    };
  }, []);
  return null;
}
