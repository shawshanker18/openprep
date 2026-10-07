"use client";
import { useEffect } from "react";

type KeyLike = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">;

/** Text fields keep their menu so paste, spellcheck and accessibility tools still work. */
export function allowsContextMenu(target: unknown) {
  const el = target as { tagName?: string; isContentEditable?: boolean } | null;
  return !!el && (el.isContentEditable === true || el.tagName === "INPUT" || el.tagName === "TEXTAREA");
}

/** F12, the inspect/console/element-picker shortcuts (Windows, Linux, Mac) and view-source. */
export function isDevToolsShortcut(e: KeyLike) {
  const k = e.key.toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  return e.key === "F12"
    || (mod && e.shiftKey && ["i", "j", "c", "k"].includes(k))
    || (mod && !e.shiftKey && k === "u")
    || (e.metaKey && e.altKey && ["i", "j", "c", "u"].includes(k));
}

/**
 * A deterrent against casual copying of questions and inspecting the page, mounted once for the whole site.
 * It cannot stop a determined person (browser menus and other tools still exist); real protection stays on the
 * server, where answers and unserved questions are never sent to the browser.
 */
export function ContentProtection() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => { if (!allowsContextMenu(e.target)) e.preventDefault(); };
    const onKeyDown = (e: KeyboardEvent) => { if (isDevToolsShortcut(e)) { e.preventDefault(); e.stopPropagation(); } };
    document.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);
  return null;
}
