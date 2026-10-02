"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signInWithGoogle } from "@/app/auth/actions";

type Gsi = {
  initialize(o: object): void;
  renderButton(el: HTMLElement, o: object): void;
};
declare global { interface Window { google?: { accounts: { id: Gsi } } } }

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Google Identity Services button: Google signs the user in on this site's own origin and returns an ID token,
 * which Supabase verifies against the Client ID. No redirect through the Supabase domain, no client secret.
 */
export function GoogleButton({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const el = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !CLIENT_ID || !el.current) return;
    let cancelled = false;
    const raw = crypto.randomUUID();
    const render = async () => {
      const g = window.google?.accounts.id;
      if (!g || cancelled || !el.current) return;
      g.initialize({
        client_id: CLIENT_ID,
        nonce: await sha256Hex(raw), // Google embeds the hash; Supabase checks it against the raw nonce
        use_fedcm_for_prompt: true,
        callback: async ({ credential }: { credential: string }) => {
          setError(null);
          const r = await signInWithGoogle({ credential, nonce: raw }).catch(() => ({ ok: false, error: undefined }));
          if (!r.ok) { setError(("error" in r && r.error) || "Google sign-in didn't work. Please try again or use the email link."); return; }
          router.replace("/dashboard");
          router.refresh();
        },
      });
      g.renderButton(el.current, { theme: "outline", size: "large", text: "continue_with", shape: "pill", width: 400, locale: "en" });
    };
    if (window.google?.accounts?.id) void render();
    else {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = () => void render();
      document.head.appendChild(s);
    }
    return () => { cancelled = true; };
  }, [enabled, router]);

  if (!CLIENT_ID) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      {enabled ? <div ref={el} className="min-h-10" /> : (
        <div className="flex h-11 w-full items-center justify-center rounded-full border text-sm text-muted-foreground">
          Tick the box above to continue with Google
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
