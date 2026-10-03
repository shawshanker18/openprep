"use client";

import { useEffect, useState } from "react";
import { newNonce } from "@/app/auth/google/nonce";

/** Apps that can finish Google sign-in (0.1.3+): older ones would lose the token on the way back, so no button there. */
function appSupportsGoogle() {
  return !!window.openprepDesktop?.googleSignIn || !!window.Capacitor?.isPluginAvailable?.("SignIn");
}

/**
 * Desktop/Android app: Google blocks sign-in inside apps, so it happens in the real browser (/auth/google), which
 * hands the result back to the app. `children` (the "or" divider) only shows when the button does.
 */
export function AppGoogleButton({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<"idle" | "opened" | "error">("idle");
  useEffect(() => { const t = setTimeout(() => setSupported(appSupportsGoogle()), 0); return () => clearTimeout(t); }, []);
  if (!supported) return null;

  const start = async () => {
    try {
      const url = `${window.location.origin}/auth/google?n=${await newNonce()}`;
      if (window.openprepDesktop) window.open(url); // the desktop app opens it in the normal browser
      else await window.Capacitor!.Plugins!.SignIn!.openInBrowser({ url });
      setState("opened");
    } catch { setState("error"); }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        <button type="button" disabled={!enabled} onClick={start}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full border text-sm font-medium disabled:text-muted-foreground">
          {enabled ? <><GoogleG /> Continue with Google</> : "Tick the box above to continue with Google"}
        </button>
        {state === "opened" && <p className="text-sm text-muted-foreground">Finish in your browser, then tap <b>Open the OpenPrep app</b>.</p>}
        {state === "error" && <p role="alert" className="text-sm text-destructive">Couldn&apos;t open your browser. Use the email link instead.</p>}
      </div>
      {children}
    </>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
