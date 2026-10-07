"use client";
import { useSyncExternalStore } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SIDEBAR_KEY } from "@/lib/sidebar";

const EVENT = "openprep:sidebar";
const subscribe = (notify: () => void) => { window.addEventListener(EVENT, notify); return () => window.removeEventListener(EVENT, notify); };
const isClosed = () => document.documentElement.dataset.sidebar === "closed";

/** Closes and reopens the desktop sidebar. The choice is remembered in this browser. */
export function SidebarToggle() {
  const closed = useSyncExternalStore(subscribe, isClosed, () => false);
  function toggle() {
    const next = !closed;
    if (next) document.documentElement.dataset.sidebar = "closed"; else delete document.documentElement.dataset.sidebar;
    try { if (next) localStorage.setItem(SIDEBAR_KEY, "closed"); else localStorage.removeItem(SIDEBAR_KEY); } catch { /* storage blocked: still works for this page */ }
    window.dispatchEvent(new Event(EVENT));
  }
  const Icon = closed ? PanelLeftOpen : PanelLeftClose;
  return (
    <button type="button" onClick={toggle} aria-pressed={closed} aria-label={closed ? "Open the sidebar" : "Close the sidebar"} title={closed ? "Open sidebar" : "Close sidebar"}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Icon className="size-5" /></button>
  );
}
