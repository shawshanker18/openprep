"use client";
import { useSyncExternalStore } from "react";
import { Choice } from "@/components/ui/choice";
import { LAYOUT_KEY } from "@/lib/sidebar";

const EVENT = "openprep:layout";
const subscribe = (notify: () => void) => { window.addEventListener(EVENT, notify); return () => window.removeEventListener(EVENT, notify); };
const current = () => document.documentElement.dataset.layout ?? "auto";

/** Pins this browser to the tablet layout (menu button, tab bar along the bottom) or the desktop one (docked sidebar), or lets the device decide. */
export function LayoutSelect() {
  const value = useSyncExternalStore(subscribe, current, () => "auto");
  function change(next: string) {
    if (next === "auto") delete document.documentElement.dataset.layout; else document.documentElement.dataset.layout = next;
    try { if (next === "auto") localStorage.removeItem(LAYOUT_KEY); else localStorage.setItem(LAYOUT_KEY, next); } catch { /* storage blocked: still works for this page */ }
    window.dispatchEvent(new Event(EVENT));
  }
  return (
    <label className="flex flex-col gap-1 text-sm">Layout
      <Choice className="w-72" value={value} onValueChange={change}
        options={[{ value: "auto", label: "Automatic (match my device)" }, { value: "tablet", label: "Tablet: menu button and bottom tab bar" }, { value: "desktop", label: "Desktop: full sidebar, no bottom bar" }]} />
    </label>
  );
}
