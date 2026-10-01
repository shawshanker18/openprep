"use client";

import { useEffect } from "react";

export function OpenApp({ href }: { href: string }) {
  useEffect(() => { window.location.href = href; }, [href]);
  return (
    <>
      <p className="text-muted-foreground">Your browser should switch to OpenPrep. If it doesn&apos;t, tap the button.</p>
      <a href={href} className="inline-flex h-12 items-center rounded-2xl bg-foreground px-6 font-medium text-background">Open OpenPrep</a>
      <p className="text-xs text-muted-foreground">You can close this tab afterwards.</p>
    </>
  );
}
