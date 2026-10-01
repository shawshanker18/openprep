"use client";

import Link from "next/link";

/** No automatic jump: on the website the openprep:// link would fail if the app isn't installed. */
export function OpenApp({ href }: { href: string }) {
  return (
    <>
      <p className="text-muted-foreground">If you asked for this link in the OpenPrep app, tap the button and the app will sign you in.</p>
      <a href={href} className="inline-flex h-12 items-center rounded-2xl bg-foreground px-6 font-medium text-background">Open the OpenPrep app</a>
      <p className="text-sm text-muted-foreground">
        Asked for it in a different browser? Open the link in that browser, or <Link className="underline" href="/login">request a new link here</Link>.
      </p>
    </>
  );
}
