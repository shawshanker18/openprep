"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleButton } from "./google-button";

export function LoginForm({ google: showGoogle, inApp = false }: { google: boolean; inApp?: boolean }) {
  const [age, setAge] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  // In the apps the email link opens in a browser, which hands the code back to the app (see /auth/callback).
  const redirectTo = () => `${window.location.origin}/auth/callback`;

  const magic = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setState(error ? "error" : "sent");
  };

  if (state === "sent") {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border p-6 text-center">
        <p className="font-medium">Check your inbox</p>
        <p className="text-sm text-muted-foreground">We sent a sign-in link to <b className="text-foreground">{email}</b>. It works once.</p>
        {inApp && <p className="text-sm text-muted-foreground">Open it on this device and your browser will send you back to the app.</p>}
        <button className="mt-2 text-sm underline" onClick={() => setState("idle")}>Use a different email</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input type="checkbox" className="mt-0.5 size-4 accent-foreground" checked={age} onChange={(e) => setAge(e.target.checked)} />
        <span>
          I am 13 or older and agree to the <Link className="text-foreground underline" href="/terms">Terms</Link> and{" "}
          <Link className="text-foreground underline" href="/privacy">Privacy policy</Link>.
        </span>
      </label>

      {showGoogle && <>
        <GoogleButton enabled={age} />
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
        </div>
      </>}

      <form onSubmit={magic} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Email
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
            autoComplete="email"
            className="h-12 rounded-xl bg-muted px-4 text-base font-normal outline-none ring-ring placeholder:text-muted-foreground focus:ring-2" />
        </label>
        <button type="submit" disabled={!age || state === "sending"}
          className="h-14 rounded-2xl bg-foreground text-base font-medium text-background transition-opacity disabled:opacity-40">
          {state === "sending" ? "Sending…" : "Continue with email"}
        </button>
        {state === "error" && <p role="alert" className="text-sm text-destructive">Couldn&apos;t send the link. Try again in a minute.</p>}
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New or returning, the same link signs you in. No password needed.
      </p>
    </div>
  );
}
