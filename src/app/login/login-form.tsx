"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OAuthGoogleButton } from "./oauth-google-button";
import { AppGoogleButton } from "./app-google-button";
import { prepareEmailSignIn } from "@/app/auth/actions";

export function LoginForm({ google: showGoogle, inApp = false }: { google: boolean; inApp?: boolean }) {
  const [age, setAge] = useState(false);
  const [privacyAccepted,setPrivacyAccepted]=useState(false);
  const canContinue=age && privacyAccepted;
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [refused, setRefused] = useState<string | null>(null);
  // In the apps the email link opens in a browser, which hands the code back to the app (see /auth/callback).
  const redirectTo = () => `${window.location.origin}/auth/callback`;

  const magic = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!canContinue){setRefused("Please accept the Privacy Policy and confirm you are 13 or older before continuing.");setState("error");return;}
    setState("sending");
    setRefused(null);
    try {
      const prepared=await prepareEmailSignIn(email,privacyAccepted);
      if(!prepared.ok){setRefused(prepared.error);setState("error");return;}
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    // The sign-up cap explains itself; anything else gets the general message.
    if (error && /Too many new accounts|create your account on the OpenPrep/.test(error.message)) setRefused(error.message);
    setState(error ? "error" : "sent");
    } catch {
      setRefused("Couldn't reach OpenPrep. Check your connection and try again.");
      setState("error");
    }
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

  const or = (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
    </div>
  );
  return (
    <div className="flex flex-col gap-4 [@media(min-height:601px)_and_(max-height:800px)]:gap-3 [@media(max-height:600px)]:gap-2">
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input type="checkbox" className="mt-0.5 size-4 accent-foreground" checked={age} onChange={(e) => setAge(e.target.checked)} />
        <span>
          I am 13 or older and agree to the <Link className="text-foreground underline" href="/terms">Terms</Link>.
        </span>
      </label>

      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input id="accept-privacy" type="checkbox" required className="mt-0.5 size-4 accent-foreground" checked={privacyAccepted} onChange={e=>setPrivacyAccepted(e.target.checked)}/>
        <span>I accept the <Link className="text-foreground underline" href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.</span>
      </label>

      {showGoogle && (inApp ? <AppGoogleButton enabled={canContinue}>{or}</AppGoogleButton> : <><OAuthGoogleButton enabled={canContinue} privacyAccepted={privacyAccepted}/>{or}</>)}

      <form onSubmit={magic} className="flex flex-col gap-3 [@media(max-height:600px)]:gap-2">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Email
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address"
            autoComplete="email"
            className="h-12 [@media(max-height:600px)]:h-11 rounded-xl bg-muted px-4 text-base font-normal outline-none ring-ring placeholder:text-muted-foreground focus:ring-2" />
        </label>
        <button type="submit" disabled={!canContinue || state === "sending"}
          className="h-12 [@media(max-height:600px)]:h-11 rounded-2xl bg-foreground text-base font-medium text-background transition-opacity disabled:opacity-40">
          {state === "sending" ? "Sending…" : "Continue with email"}
        </button>
        {state === "error" && <p role="alert" className="text-sm text-destructive">{refused ?? "Couldn\u2019t send the link. Try again in a minute."}</p>}
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New or returning, the same link signs you in. No password needed.
      </p>
    </div>
  );
}
