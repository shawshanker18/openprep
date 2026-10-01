"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { GoogleButton } from "./google-button";

export function LoginForm({ google: showGoogle }: { google: boolean }) {
  const [age, setAge] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const redirectTo = () => `${window.location.origin}/auth/callback`;

  const magic = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setState(error ? "error" : "sent");
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={age} onChange={(e) => setAge(e.target.checked)} />
        <span>
          I am 13 or older and agree to the <Link className="underline" href="/terms">Terms</Link> and{" "}
          <Link className="underline" href="/privacy">Privacy policy</Link>.
        </span>
      </label>
      {showGoogle && <>
        <GoogleButton enabled={age} />
        <div className="text-center text-xs text-muted-foreground">or</div>
      </>}
      {state === "sent" ? (
        <p className="rounded-lg border p-3 text-sm">Check your inbox — we sent a sign-in link to <b>{email}</b>.</p>
      ) : (
        <form onSubmit={magic} className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Button type="submit" variant="outline" disabled={!age || state === "sending"}>
            {state === "sending" ? "Sending…" : "Email me a sign-in link"}
          </Button>
          {state === "error" && <p className="text-sm text-destructive">Couldn&apos;t send the link. Try again in a minute.</p>}
        </form>
      )}
    </div>
  );
}
