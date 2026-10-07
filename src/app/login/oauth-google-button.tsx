"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { beginGoogleOAuth } from "@/app/auth/actions";

/** Redirect OAuth works on custom domains without embedding Google's origin-bound GIS popup. */
export function OAuthGoogleButton({ enabled, privacyAccepted }: { enabled: boolean; privacyAccepted: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <Dialog><DialogTrigger render={<Button variant="outline" className="min-h-11 w-full rounded-full" disabled={!enabled} />}>Continue with Google</DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>Continue with Google</DialogTitle><DialogDescription>Enter the email address of the Google account you’ll choose. This lets OpenPrep apply its signup limits before opening Google.</DialogDescription></DialogHeader>
      <form className="flex flex-col gap-3" onSubmit={async e=>{
        e.preventDefault(); if(busy || !enabled) return;
        const email=String(new FormData(e.currentTarget).get("email")??"");
        setBusy(true);setError(null);
        try {const result=await beginGoogleOAuth(email,privacyAccepted);if(!result.ok){setError(result.error);setBusy(false);return;}window.location.assign(result.url);}
        catch {setError("Couldn’t open Google. Check your connection or use the email sign-in link.");setBusy(false);}
      }}>
        <label className="flex flex-col gap-1 text-sm">Google account email<input name="email" type="email" required autoComplete="email" maxLength={254} className="h-11 min-w-0 rounded-lg border px-3" /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy || !enabled}>{busy?"Opening Google…":"Continue to Google"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}
