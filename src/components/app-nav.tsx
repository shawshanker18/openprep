"use client";

import { FeedbackDialog } from "@/components/feedback-dialog";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, Bookmark, BookOpen, Calculator, Check, ClipboardList, GraduationCap, Home, Library, ListChecks, LogOut, Menu, Settings, ShieldCheck, Sparkles, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ChecklistItem } from "@/server/notifications";

export const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/progress", label: "Progress", icon: BarChart3 },
      { href: "/mistakes", label: "Mistakes", icon: XCircle },
      { href: "/bookmarks", label: "Saved questions", icon: Bookmark },
    ],
  },
  {
    label: "Learn",
    items: [
      { href: "/start", label: "Start from scratch", icon: GraduationCap },
      { href: "/skills", label: "Your skills", icon: BookOpen },
      { href: "/desmos", label: "Desmos", icon: Calculator },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/practice", label: "Adaptive Practice", icon: Sparkles },
      { href: "/question-bank", label: "Question bank", icon: Library },
      { href: "/tests", label: "Practice tests", icon: ClipboardList },
    ],
  },
] as const;

/** Bottom bar on phones: the five most used destinations. */
export const MOBILE_TABS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/practice", label: "Practice", icon: Sparkles },
  { href: "/start", label: "Learn", icon: GraduationCap },
  { href: "/tests", label: "Tests", icon: ClipboardList },
  { href: "/progress", label: "Progress", icon: BarChart3 },
] as const;

export function CurrentSection() {
  const path = usePathname();
  const item = NAV_GROUPS.flatMap(group => [...group.items]).sort((a, b) => b.href.length - a.href.length).find(item => path === item.href || path.startsWith(`${item.href}/`));
  return <span className="mr-auto text-sm font-medium" aria-label="Current section">{item?.label ?? (path.startsWith("/settings") ? "Settings" : "OpenPrep")}</span>;
}

/**
 * Exact match, or a sub-page. Links with a query (practice presets) match on the query too, and plain
 * /practice stays inactive while a preset or a question-bank list is running there.
 */
function isActive(path: string, search: URLSearchParams, href: string) {
  if (href.includes("?")) {
    const [p, q] = href.split("?");
    return path === p && [...new URLSearchParams(q)].every(([k, v]) => search.get(k) === v);
  }
  if (href === "/practice") return path === href && !search.has("preset") && search.get("mode") !== "list";
  return path === href || path.startsWith(`${href}/`);
}

/** Sidebar button that opens the full "Getting started" checklist in its own window. Hidden once everything is done. */
function Checklist({ items, onNavigate, compact = false }: { items: ChecklistItem[]; onNavigate?: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  const next = items.find((i) => !i.done);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {compact ? (
        <DialogTrigger aria-label={`Getting started, ${done} of ${items.length} done`} title={`Getting started ${done}/${items.length}`}
          className="hidden shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground side:snug:flex"><ListChecks className="size-4" /></DialogTrigger>
      ) : (
        <DialogTrigger className="flex flex-col gap-2 rounded-md border p-2 text-left text-sm hover:bg-muted side:snug:hidden">
          <span className="flex items-center justify-between px-1">
            <span>Getting started</span><span className="tabular-nums text-muted-foreground">{done}/{items.length}</span>
          </span>
          <span className="mx-1 h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-primary" style={{ width: `${(100 * done) / items.length}%` }} /></span>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Getting started</DialogTitle>
          <DialogDescription>
            {done} of {items.length} done. {next ? `Next up: ${next.label.toLowerCase()}.` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${(100 * done) / items.length}%` }} /></div>
        <ol className="flex flex-col gap-2">
          {items.map((i, n) => (
            <li key={i.id} className="flex items-center gap-3 rounded-lg border p-3">
              <span aria-hidden className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs ${i.done ? "bg-primary text-primary-foreground" : ""}`}>
                {i.done ? <Check className="size-4" /> : n + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`font-medium ${i.done ? "text-muted-foreground line-through" : ""}`}>{i.label}</span>
                <span className="text-xs text-muted-foreground">{i.hint}</span>
              </span>
              {!i.done && (
                <Button size="sm" variant={i === next ? "default" : "outline"}
                  render={<Link href={i.href} onClick={() => { setOpen(false); onNavigate?.(); }} />}>Go</Button>
              )}
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

export function NavLinks({ checklist, user, signOut, isAdmin = false, onNavigate }: {
  checklist: ChecklistItem[]; user: string; signOut: () => Promise<void>; isAdmin?: boolean; onNavigate?: () => void;
}) {
  const path = usePathname();
  const search = useSearchParams();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 side:gap-[clamp(0.25rem,1.6dvh,1rem)]">
      {NAV_GROUPS.map((g) => (
        <div key={g.label ?? "main"} className="flex flex-col gap-0.5">
          {g.label && <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{g.label}</p>}
          {g.items.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={onNavigate} aria-current={isActive(path, search, href) ? "page" : undefined}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm side:h-[clamp(1.5rem,5.6dvh,2.125rem)] side:py-0 hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium">
              <Icon className="size-4" />{label}
            </Link>
          ))}
        </div>
      ))}
      <div className="mt-auto flex flex-col gap-2">
        <Checklist items={checklist} onNavigate={onNavigate} />
        {isAdmin && (
          <Link href="/admin" onClick={onNavigate} aria-current={path.startsWith("/admin") ? "page" : undefined}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm side:h-[clamp(1.5rem,5.6dvh,2.125rem)] side:py-0 hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium side:snug:hidden">
            <ShieldCheck className="size-4" />Admin
          </Link>
        )}
        {/* Sidebar: account row with feedback and sign out as icons (saves a third of the height). Phone menu: full labels. */}
        <div className={onNavigate ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-1 side:snug:justify-between"}>
          {onNavigate && <FeedbackDialog />}
          <Link href="/settings" onClick={onNavigate} aria-current={isActive(path, search, "/settings") ? "page" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm side:h-[clamp(1.5rem,5.6dvh,2.125rem)] side:py-0 hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium side:snug:basis-full">
            <Settings className="size-4 shrink-0" /><span className="truncate">{user}</span>
          </Link>
          {!onNavigate && <Checklist items={checklist} compact />}
          {!onNavigate && isAdmin && (
            <Link href="/admin" aria-label="Admin" title="Admin" aria-current={path.startsWith("/admin") ? "page" : undefined}
              className="hidden shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted side:snug:flex"><ShieldCheck className="size-4" /></Link>
          )}
          {!onNavigate && <FeedbackDialog iconOnly />}
          <form action={signOut} className={onNavigate ? undefined : "shrink-0"}>
            {onNavigate
              ? <button className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground">Sign out</button>
              : <button type="submit" aria-label="Sign out" title="Sign out" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="size-4" /></button>}
          </form>
        </div>
      </div>
    </div>
  );
}

/** Phone/tablet: hamburger that opens the full sidebar as a sheet. */
export function MobileMenu(props: { checklist: ChecklistItem[]; user: string; signOut: () => Promise<void>; isAdmin?: boolean }) {
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
  const search = useSearchParams();
  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-10 flex justify-around border-t bg-background pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] desk:hidden">
      {MOBILE_TABS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={isActive(path, search, href) ? "page" : undefined}
          className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground aria-[current=page]:text-foreground">
          <Icon className="size-5" />{label}
        </Link>
      ))}
    </nav>
  );
}
