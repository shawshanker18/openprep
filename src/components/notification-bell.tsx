"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Bell, X } from "lucide-react";
import type { Notification } from "@/server/notifications";
import { dismissNotificationsAction } from "@/server/notifications-actions";

const PANEL_W = 280;
const STORAGE_KEY = "openprep:dismissed-notifications";

const noSubscribe = () => () => {};
function storedDismissals() {
  try { return localStorage.getItem(STORAGE_KEY) ?? "[]"; } catch { return "[]"; } // storage unavailable
}
function parseDismissals(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function NotificationBell({ items, align = "left" }: { items: Notification[]; align?: "left" | "right" }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const stored = useSyncExternalStore(noSubscribe, storedDismissals, () => "[]");
  // Kept in state too, so dismissing still works for this visit when storage is unavailable.
  const [dismissedNow, setDismissedNow] = useState<string[]>([]);
  const dismissed = useMemo(() => new Set([...parseDismissals(stored), ...dismissedNow]), [stored, dismissedNow]);

  const close = () => ref.current?.removeAttribute("open");

  const onToggle = () => {
    const el = ref.current;
    if (!el?.open) return setPos(null);
    const r = el.querySelector("summary")!.getBoundingClientRect();
    const width = Math.min(PANEL_W, window.innerWidth - 16);
    const left = align === "right" ? r.right - width : r.left;
    setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(left, window.innerWidth - width - 8)) });
  };

  useEffect(() => {
    if (!pos) return;
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const scroll = (e: Event) => { if (!ref.current?.contains(e.target as Node)) close(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", close);
    document.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", close);
      document.removeEventListener("scroll", scroll, true);
    };
  }, [pos]);

  const activeItems = items.filter((n) => !dismissed.has(n.id));

  const dismissOne = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = new Set(dismissed);
    next.add(id);
    setDismissedNow(Array.from(next));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {
      // storage unavailable
    }
    dismissNotificationsAction([id]).catch(() => {});
  };

  const clearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const allIds = items.map((n) => n.id);
    const next = new Set(dismissed);
    for (const id of allIds) next.add(id);
    setDismissedNow(Array.from(next));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {
      // storage unavailable
    }
    dismissNotificationsAction(allIds).catch(() => {});
  };

  return (
    <details ref={ref} className="relative" onToggle={onToggle}>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1 hover:bg-muted" aria-label={`Notifications (${activeItems.length})`}>
        <Bell className="size-4" />
        {activeItems.length > 0 && (
          <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground tabular-nums">
            {activeItems.length}
          </span>
        )}
      </summary>
      {pos && (
        <div style={{ top: pos.top, left: pos.left, width: Math.min(PANEL_W, window.innerWidth - 16), maxHeight: Math.max(80, window.innerHeight - pos.top - 8) }}
          className="fixed z-50 overflow-y-auto rounded-lg border border-border/80 bg-background p-2.5 text-sm text-foreground shadow-md">
          {activeItems.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5 px-1">
                <span className="text-xs font-semibold text-muted-foreground">Notifications</span>
                {activeItems.length >= 2 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <ul className="flex flex-col gap-1 pt-0.5">
                {activeItems.map((n) => (
                  <li key={n.id} className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                    <Link href={n.href} onClick={close} className="flex-1 text-xs font-medium text-foreground">
                      {n.label}
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => dismissOne(n.id, e)}
                      title="Dismiss notification"
                      className="rounded-sm p-0.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted-foreground/20 transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="px-2 py-2 text-xs text-muted-foreground text-center">You&apos;re all caught up.</p>
          )}
        </div>
      )}
    </details>
  );
}
