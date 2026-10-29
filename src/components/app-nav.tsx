"use client";

import { FeedbackDialog } from "@/components/feedback-dialog";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Activity, Bookmark, BookOpen, Calculator, ClipboardList, CreditCard, GraduationCap, Home, Library, LogOut, Menu, Settings, ShieldCheck, Sparkles,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const ROW = "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm side:h-[clamp(1.375rem,5.6dvh,2.125rem)] side:py-0 hover:bg-muted";

export type AccountSummary = { name: string; email: string | null; avatarUrl: string | null };

/** The profile picture from the sign-in provider, or the person's initial when there isn't one. */
export function Avatar({ account, className = "size-8" }: { account: AccountSummary; className?: string }) {
  const initial = (account.name || account.email || "?").trim().charAt(0).toUpperCase();
  return account.avatarUrl
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={account.avatarUrl} alt="" referrerPolicy="no-referrer" className={`${className} shrink-0 rounded-full object-cover`} />
    : <span aria-hidden className={`${className} grid shrink-0 place-items-center rounded-full bg-muted text-sm font-medium text-foreground`}>{initial}</span>;
}

export const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/analysis", label: "Analysis", icon: Activity },
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

/** Bottom bar on phones: the most used destinations. */
export const MOBILE_TABS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/practice", label: "Practice", icon: Sparkles },
  { href: "/start", label: "Learn", icon: GraduationCap },
  { href: "/tests", label: "Tests", icon: ClipboardList },
  { href: "/analysis", label: "Analysis", icon: Activity },
] as const;

/** Where a nav item points. The guest site mounts the same menu under /guest, and its home is /guest rather than /guest/dashboard. */
export function hrefFor(base: string, href: string) {
  return base && href === "/dashboard" ? base : `${base}${href}`;
}

export function CurrentSection({ base = "" }: { base?: string }) {
  const path = usePathname();
  const item = NAV_GROUPS.flatMap(group => [...group.items]).sort((a, b) => b.href.length - a.href.length).find(item => {
    const target = hrefFor(base, item.href);
    return item.href === "/dashboard" ? path === target : path === target || path.startsWith(`${target}/`);
  });
  return <span className="mr-auto text-sm font-medium" aria-label="Current section">{item?.label ?? (path.startsWith(`${base}/pricing`) ? "Upgrade" : path.startsWith(`${base}/account`) ? "Account" : path.startsWith(`${base}/settings`) ? "Settings" : "OpenPrep")}</span>;
}

/**
 * Exact match, or a sub-page. Links with a query (practice presets) match on the query too, and plain
 * /practice stays inactive while a preset or a question-bank list is running there.
 */
function isActive(path: string, search: URLSearchParams, href: string, base = "") {
  const target = hrefFor(base, href);
  if (href.includes("?")) {
    const [p, q] = target.split("?");
    return path === p && [...new URLSearchParams(q)].every(([k, v]) => search.get(k) === v);
  }
  if (href === "/practice") return path === target && !search.has("preset") && search.get("mode") !== "list";
  if (href === "/dashboard") return path === target;
  return path === target || path.startsWith(`${target}/`);
}

/** Guest mode: the same menu under /guest, with Sign in where Sign out would be. */
export function NavLinks({ signOut, onNavigate, base = "", guest = false, account }: { signOut?: () => Promise<void>; onNavigate?: () => void; base?: string; guest?: boolean; account?: AccountSummary }) {
  const path = usePathname();
  const search = useSearchParams();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 side:gap-[clamp(0.25rem,1.6dvh,1rem)]">
      {NAV_GROUPS.map((g) => (
        <div key={g.label ?? "main"} className="flex flex-col gap-0.5">
          {g.label && <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{g.label}</p>}
          {g.items.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={hrefFor(base, href)} onClick={onNavigate} aria-current={isActive(path, search, href, base) ? "page" : undefined}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm side:h-[clamp(1.375rem,5.6dvh,2.125rem)] side:py-0 hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium">
              <Icon className="size-4" />{label}
            </Link>
          ))}
        </div>
      ))}
      {/* Upgrade stays at the bottom of the full menu, including on mobile. */}
      <div className="mt-auto flex flex-col gap-0.5">
        <Link href={guest ? "/pricing" : hrefFor(base, "/pricing")} onClick={onNavigate} aria-current={isActive(path, search, "/pricing", base) ? "page" : undefined} className={`${ROW} mb-2 border border-border font-medium aria-[current=page]:bg-muted`}><CreditCard className="size-4" />Upgrade</Link>
        {account ? (
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            <Link href="/account" onClick={onNavigate} aria-current={path.startsWith("/account") ? "page" : undefined}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-muted aria-[current=page]:bg-muted">
              <Avatar account={account} />
              <span className="min-w-0 flex-1 leading-tight"><span className="block truncate text-sm font-medium">{account.name}</span><span className="block text-xs text-muted-foreground">Your account</span></span>
            </Link>
            {signOut && (
              <form action={signOut}>
                <button type="submit" aria-label="Sign out" title="Sign out" className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="size-4" /></button>
              </form>
            )}
          </div>
        ) : (
          <>
            <FeedbackDialog />
            {guest ? (
              <Link href="/login" className={`${ROW} text-muted-foreground hover:text-foreground`}><LogOut className="size-4 rotate-180" />Sign in</Link>
            ) : signOut ? (
              <form action={signOut}>
                <button type="submit" className={`${ROW} w-full text-left text-muted-foreground hover:text-foreground`}><LogOut className="size-4" />Sign out</button>
              </form>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/** Settings (and Admin, for the one account that has it) as icons beside the notification bell. */
export function AccountLinks({ isAdmin, user, base = "" }: { isAdmin: boolean; user: string; base?: string }) {
  const path = usePathname();
  const icon = "rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground";
  return (
    <div className="flex items-center">
      {isAdmin && <Link href="/admin" aria-label="Admin" title="Admin" aria-current={path.startsWith("/admin") ? "page" : undefined} className={icon}><ShieldCheck className="size-5" /></Link>}
      <Link href={`${base}/settings`} aria-label="Settings" title={`Settings · ${user}`} aria-current={path.startsWith(`${base}/settings`) ? "page" : undefined} className={icon}><Settings className="size-5" /></Link>
    </div>
  );
}

/** Phone/tablet: hamburger that opens the full sidebar as a sheet. */
export function MobileMenu(props: { signOut?: () => Promise<void>; base?: string; guest?: boolean; account?: AccountSummary }) {
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

export function MobileTabs({ base = "" }: { base?: string }) {
  const path = usePathname();
  const search = useSearchParams();
  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-10 flex justify-around border-t bg-background pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] desk:hidden">
      {MOBILE_TABS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={hrefFor(base, href)} aria-current={isActive(path, search, href, base) ? "page" : undefined}
          className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground aria-[current=page]:text-foreground">
          <Icon className="size-5" />{label}
        </Link>
      ))}
    </nav>
  );
}
