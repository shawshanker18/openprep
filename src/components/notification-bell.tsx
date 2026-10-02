"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import type { Notification } from "@/server/notifications";

const PANEL_W = 256;

/**
 * Native <details> dropdown. The panel is position: fixed and placed under the bell when it opens, so a scrolling
 * container (the sidebar) can't clip it. Closes on link click, outside click, or Escape.
 */
// align="right": the panel's right edge lines up with the bell (mobile header), so it doesn't run off-screen.
export function NotificationBell({ items, align = "left" }: { items: Notification[]; align?: "left" | "right" }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
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
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  return (
    <details ref={ref} className="relative" onToggle={onToggle}>
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1 hover:bg-muted" aria-label={`Notifications (${items.length})`}>
        <Bell className="size-4" />
        {items.length > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">{items.length}</span>}
      </summary>
      {pos && (
        <div style={{ top: pos.top, left: pos.left, width: Math.min(PANEL_W, window.innerWidth - 16) }}
          className="fixed z-50 rounded-lg border bg-background p-2 text-sm text-foreground shadow-sm">
          {items.length ? (
            <ul className="flex flex-col gap-1">
              {items.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} onClick={close} className="block rounded-md px-2 py-1.5 hover:bg-muted">{n.label}</Link>
                </li>
              ))}
            </ul>
          ) : <p className="px-2 py-1.5 text-muted-foreground">You&apos;re all caught up.</p>}
        </div>
      )}
    </details>
  );
}
