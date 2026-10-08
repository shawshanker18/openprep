"use client";

import { FeedbackDialog } from "@/components/feedback-dialog";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, Bookmark, BookOpen, Calculator, ClipboardList, GraduationCap, Home, Library, LogOut, Menu, Settings, ShieldCheck, Sparkles, XCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const ROW = "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm side:h-[clamp(1.5rem,5.6dvh,2.125rem)] side:py-0 hover:bg-muted";

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

export function NavLinks({ signOut, onNavigate }: { signOut: () => Promise<void>; onNavigate?: () => void }) {
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
      {/* The menu ends with just two things: feedback and sign out. Settings and Admin live in the top bar. */}
      <div className="mt-auto flex flex-col gap-0.5">
        <FeedbackDialog />
        <form action={signOut}>
          <button type="submit" className={`${ROW} w-full text-left text-muted-foreground hover:text-foreground`}><LogOut className="size-4" />Sign out</button>
        </form>
      </div>
    </div>
  );
}

/** Settings (and Admin, for the one account that has it) as icons beside the notification bell. */
export function AccountLinks({ isAdmin, user }: { isAdmin: boolean; user: string }) {
  const path = usePathname();
  const icon = "rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground";
  return (
    <div className="flex items-center">
      {isAdmin && <Link href="/admin" aria-label="Admin" title="Admin" aria-current={path.startsWith("/admin") ? "page" : undefined} className={icon}><ShieldCheck className="size-5" /></Link>}
      <Link href="/settings" aria-label="Settings" title={`Settings · ${user}`} aria-current={path.startsWith("/settings") ? "page" : undefined} className={icon}><Settings className="size-5" /></Link>
    </div>
  );
}

/** Phone/tablet: hamburger that opens the full sidebar as a sheet. */
export function MobileMenu(props: { signOut: () => Promise<void> }) {
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
