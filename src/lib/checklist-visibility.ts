"use client";
import { useSyncExternalStore } from "react";

const KEY = "openprep-hide-checklist";
const EVENT = "openprep:checklist";
const subscribe = (notify: () => void) => { window.addEventListener(EVENT, notify); window.addEventListener("storage", notify); return () => { window.removeEventListener(EVENT, notify); window.removeEventListener("storage", notify); }; };
const read = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

/** Whether this student hid the "Getting started" list (remembered in this browser; restorable in Settings). */
export const useChecklistHidden = () => useSyncExternalStore(subscribe, read, () => false);

export function setChecklistHidden(hidden: boolean) {
  try { if (hidden) localStorage.setItem(KEY, "1"); else localStorage.removeItem(KEY); } catch { /* storage blocked: applies until reload */ }
  window.dispatchEvent(new Event(EVENT));
}
