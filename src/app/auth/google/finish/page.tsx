"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signInWithGoogle } from "@/app/auth/actions";
import { takeNonce } from "../nonce";

/**
 * App half: the app opens this with the Google ID token in the fragment (never sent to a server in the address).
 * With the nonce the app kept, the server signs the student in exactly like the website's Google button does.
 */
export default function FinishGoogleInApp() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const credential = new URLSearchParams(window.location.hash.slice(1)).get("t");
    window.history.replaceState(null, "", window.location.pathname); // the token doesn't stay in the address
    const nonce = takeNonce();
    const expired = { ok: false as const, error: "This sign-in has expired or was started somewhere else. Tap Continue with Google in this app again." };
    (credential && nonce ? signInWithGoogle({ credential, nonce, privacyAccepted:true }) : Promise.resolve(expired))
      .then((r) => {
        if (!r.ok) { setError(("error" in r && r.error) || "Google sign-in didn't work. Please try again or use the email link."); return; }
        router.replace("/dashboard");
        router.refresh();
      })
      .catch(() => setError("Couldn't reach OpenPrep. Check your connection and try again."));
  }, [router]);

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{error ? "Sign-in didn't finish" : "Signing you in…"}</h1>
      {error && (
        <>
          <p role="alert" className="text-muted-foreground">{error}</p>
          <Link href="/login" className="inline-flex h-12 items-center rounded-2xl bg-foreground px-6 font-medium text-background">Back to sign in</Link>
        </>
      )}
    </main>
  );
}
