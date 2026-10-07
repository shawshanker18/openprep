"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Footer feedback link, omitted from test pages to keep the layout focused. */
export function FooterFeedback() {
  const path = usePathname();
  if (path.startsWith("/test/")) return null;
  return <> · <Link className="underline" href="/feedback">Send feedback</Link></>;
}

/** Show the notice on app overview/settings/feedback pages and public information pages. */
export function SiteFooter() {
  const path = usePathname();
  const visible = ["/", "/login", "/onboarding", "/about", "/privacy", "/terms", "/security", "/dashboard", "/settings", "/feedback", "/guest", "/guest/settings"].includes(path);
  if (!visible) return null;
  return <footer className="site-footer mt-auto border-t px-4 py-3 text-center text-xs text-muted-foreground">
    SAT® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, OpenPrep.<FooterFeedback />
  </footer>;
}
