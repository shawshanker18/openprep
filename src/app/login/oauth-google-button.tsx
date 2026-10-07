"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { beginGoogleOAuth } from "@/app/auth/actions";

export function OAuthGoogleButton({ enabled, privacyAccepted }: { enabled: boolean; privacyAccepted: boolean }) {
  const opening = useRef(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function openGoogle() {
    if (opening.current || !enabled) return;
    opening.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await beginGoogleOAuth(privacyAccepted);
        if (!result.ok) { setError(result.error); opening.current = false; return; }
        window.location.assign(result.url);
      } catch {
        setError("Couldn’t open Google. Check your connection or continue with email.");
        opening.current = false;
      }
    });
  }
  return <div className="flex flex-col gap-2">
    <Button type="button" variant="outline" className="min-h-11 w-full rounded-full" disabled={pending || !enabled} aria-busy={pending} onClick={openGoogle}>
      {pending ? "Opening Google…" : "Continue with Google"}
    </Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
