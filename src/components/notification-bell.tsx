"use client";

import Link from "next/link";
import { useRef } from "react";
import { Bell } from "lucide-react";
import type { Notification } from "@/server/notifications";

/** Native <details> dropdown; closes itself when an item is followed (the layout persists across navigations). */
// align="right": anchored to the right edge (mobile header), so the panel doesn't run off-screen.
export function NotificationBell({ items, align = "left" }: { items: Notification[]; align?: "left" | "right" }) {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={ref} className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1 hover:bg-muted" aria-label={`Notifications (${items.length})`}>
        <Bell className="size-4" />
        {items.length > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">{items.length}</span>}
      </summary>
      <div className={`absolute ${align === "right" ? "right-0" : "left-0"} z-20 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border bg-background p-2 text-sm text-foreground shadow-sm`}>
        {items.length ? (
          <ul className="flex flex-col gap-1">
            {items.map((n) => (
              <li key={n.id}>
                <Link href={n.href} onClick={() => ref.current?.removeAttribute("open")} className="block rounded-md px-2 py-1.5 hover:bg-muted">{n.label}</Link>
              </li>
            ))}
          </ul>
        ) : <p className="px-2 py-1.5 text-muted-foreground">You&apos;re all caught up.</p>}
      </div>
    </details>
  );
}
