"use client";

import { useCallback, useState } from "react";
import { GoogleButton } from "@/app/login/google-button";

/** Browser half: Google signs the student in here, and the ID token goes back to the app through openprep://. */
export function BrowserGoogle({ nonceHash }: { nonceHash: string }) {
  const [link, setLink] = useState<string | null>(null);
  const onToken = useCallback((credential: string) => {
    const href = `openprep://auth?google=${credential}`;
    setLink(href);
    window.location.href = href; // browsers may want a tap for this: the button below
  }, []);

  if (link) {
    return (
      <>
        <p className="text-muted-foreground">Signed in with Google. Tap the button to finish in the OpenPrep app.</p>
        <a href={link} className="inline-flex h-12 items-center rounded-2xl bg-foreground px-6 font-medium text-background">Open the OpenPrep app</a>
        <p className="text-sm text-muted-foreground">You can close this tab afterwards.</p>
      </>
    );
  }
  return (
    <>
      <p className="text-muted-foreground">Choose your Google account. You&apos;ll go straight back to the OpenPrep app.</p>
      <GoogleButton enabled nonceHash={nonceHash} onToken={onToken} />
    </>
  );
}
