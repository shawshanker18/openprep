"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Footer feedback link, omitted from test pages to keep the layout focused. */
export function FooterFeedback() {
  const path = usePathname();
  if (path.startsWith("/test/")) return null;
  return <> · <Link className="underline" href="/feedback">Send feedback</Link></>;
}
