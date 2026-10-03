// Google sign-in from the desktop/Android app: the app keeps a one-time nonce here (its own storage on this site).
// Google embeds only the nonce's hash in the ID token, so a token caught on its way back to the app is useless
// without the nonce, which never leaves the app.
import { sha256Hex } from "@/app/login/google-button";

const KEY = "openprep_google_nonce";
const MAX_AGE_MS = 15 * 60_000;

/** A fresh nonce for one sign-in; returns the hash to send to Google. */
export async function newNonce() {
  const raw = crypto.randomUUID();
  localStorage.setItem(KEY, JSON.stringify({ raw, at: Date.now() }));
  return sha256Hex(raw);
}

/** The nonce for finishing sign-in, once (it's removed), if it's recent. */
export function takeNonce(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as { raw?: unknown; at?: unknown } | null;
    localStorage.removeItem(KEY);
    return v && typeof v.raw === "string" && typeof v.at === "number" && Date.now() - v.at < MAX_AGE_MS ? v.raw : null;
  } catch { return null; }
}
