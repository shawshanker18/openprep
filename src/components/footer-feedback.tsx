"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Footer feedback link, omitted from test pages to keep the layout focused. */
export function FooterFeedback() {
  const path = usePathname();
  if (path.startsWith("/test/")) return null;
  return <> · <Link className="underline" href="/feedback">Send feedback</Link></>;
}

/** Pages that render inside the signed-in app shell (its footer lives in the content column, never under the sidebar). */
const APP_PAGES = ["/dashboard", "/settings"];
/** Standalone pages that show the notice at the bottom of the window. */
const SITE_PAGES = ["/", "/login", "/onboarding", "/about", "/privacy", "/terms", "/security", "/feedback", "/guest", "/guest/settings"];

/**
 * The College Board trademark notice. `scope="app"` is rendered by the app shell inside its content column so the fixed
 * sidebar and the phone tab bar can never cover it; `scope="site"` is the root-level footer for everything else.
 */
export function SiteFooter({ scope = "site" }: { scope?: "site" | "app" }) {
  const path = usePathname();
  const visible = (scope === "app" ? APP_PAGES : SITE_PAGES).includes(path) || (scope === "site" && path.startsWith("/learn"));
  if (!visible) return null;
  return <footer className="site-footer mt-auto border-t px-4 py-3 text-center text-xs text-muted-foreground">
    SAT® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, OpenPrep.{scope === "site" && <> · <Link className="underline" href="/learn">Free SAT lessons</Link></>}<FooterFeedback />
  </footer>;
}
