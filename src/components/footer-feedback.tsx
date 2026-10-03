"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Footer link to /feedback. Never on test pages: leaving a locked test by a link would be a way out of lockdown. */
export function FooterFeedback() {
  const path = usePathname();
  if (path.startsWith("/test/")) return null;
  return <> · <Link className="underline" href="/feedback">Send feedback</Link></>;
}
