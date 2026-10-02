"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  await (await createClient()).auth.signOut();
  redirect("/");
}

const Google = z.object({ credential: z.string().regex(/^[\w-]+\.[\w-]+\.[\w-]+$/).max(8192), nonce: z.uuid() });

/**
 * Finish Google sign-in on the server: Supabase checks Google's ID token (and our nonce) and the session cookies
 * are written here, HttpOnly, instead of by page scripts.
 */
export async function signInWithGoogle(input: z.input<typeof Google>) {
  const p = Google.safeParse(input);
  if (!p.success) return { ok: false as const };
  const { error } = await (await createClient()).auth.signInWithIdToken({ provider: "google", token: p.data.credential, nonce: p.data.nonce });
  return { ok: !error };
}
