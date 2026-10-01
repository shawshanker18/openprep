"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, Bookmark, BookOpen, Calculator, CalendarCheck, ClipboardList, Home, Menu, Settings, SlidersHorizontal, Sparkles, XCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ChecklistItem } from "@/server/notifications";

export const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Home", icon: Home },
      { href: "/plan", label: "Study plan", icon: CalendarCheck },
      { href: "/progress", label: "Progress", icon: BarChart3 },
      { href: "/mistakes", label: "Mistakes", icon: XCircle },
      { href: "/bookmarks", label: "Saved", icon: Bookmark },
    ],
  },
  {
    label: "Learn",
    items: [
      { href: "/skills", label: "Skills", icon: BookOpen },
      { href: "/desmos", label: "Desmos", icon: Calculator },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/practice", label: "Smart practice", icon: Sparkles },
      { href: "/practice/custom", label: "Custom practice", icon: SlidersHorizontal },
      { href: "/tests", label: "Practice tests", icon: ClipboardList },
    ],
  },
] as const;

/** Bottom bar on phones: the five most used destinations. */
export const MOBILE_TABS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/practice", label: "Practice", icon: Sparkles },
  { href: "/skills", label: "Skills", icon: BookOpen },
  { href: "/tests", label: "Tests", icon: ClipboardList },
  { href: "/progress", label: "Progress", icon: BarChart3 },
] as const;

/** Exact match, or a sub-page — except /practice, whose sub-page /practice/custom has its own entry. */
function isActive(path: string, href: string) {
  if (path === href) return true;
  if (href === "/practice") return false;
  return path.startsWith(`${href}/`);
}

function Checklist({ items, onNavigate }: { items: ChecklistItem[]; onNavigate?: () => void }) {
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  return (
    <details className="rounded-md border p-2 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between px-1">
        <span>Getting started</span><span className="tabular-nums text-muted-foreground">{done}/{items.length}</span>
      </summary>
      <ul className="mt-2 flex flex-col gap-0.5">
        {items.map((i) => (
          <li key={i.id}>
            <Link href={i.href} onClick={onNavigate} className={`flex items-start gap-2 rounded-md px-1 py-1 hover:bg-muted ${i.done ? "text-muted-foreground line-through" : ""}`}>
              <span aria-hidden className="mt-0.5">{i.done ? "✓" : "○"}</span>{i.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function NavLinks({ checklist, user, signOut, onNavigate }: {
  checklist: ChecklistItem[]; user: string; signOut: () => Promise<void>; onNavigate?: () => void;
}) {
  const path = usePathname();
  return (
    <div className="flex flex-1 flex-col gap-4">
      {NAV_GROUPS.map((g) => (
        <div key={g.label ?? "main"} className="flex flex-col gap-0.5">
          {g.label && <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{g.label}</p>}
          {g.items.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={onNavigate} aria-current={isActive(path, href) ? "page" : undefined}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium">
              <Icon className="size-4" />{label}
            </Link>
          ))}
        </div>
      ))}
      <div className="mt-auto flex flex-col gap-2">
        <Checklist items={checklist} onNavigate={onNavigate} />
        <Link href="/settings" onClick={onNavigate} aria-current={isActive(path, "/settings") ? "page" : undefined}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium">
          <Settings className="size-4" /><span className="truncate">{user}</span>
        </Link>
        <form action={signOut}><button className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground">Sign out</button></form>
      </div>
    </div>
  );
}

/** Phone/tablet: hamburger that opens the full sidebar as a sheet. */
export function MobileMenu(props: { checklist: ChecklistItem[]; user: string; signOut: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="rounded-md p-1.5 hover:bg-muted" aria-label="Open navigation menu"><Menu className="size-5" /></SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto p-4">
        <SheetTitle className="text-lg font-semibold">OpenPrep</SheetTitle>
        <NavLinks {...props} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function MobileTabs() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      {MOBILE_TABS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={isActive(path, href) ? "page" : undefined}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground aria-[current=page]:text-foreground">
          <Icon className="size-5" />{label}
        </Link>
      ))}
    </nav>
  );
}
