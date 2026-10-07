"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { clientIp, issueSignupTicket, SIGNUP_REFUSALS } from "@/server/signup";

export async function signOut() {
  await (await createClient()).auth.signOut();
  redirect("/");
}

/** Reserve an address before requesting its email link. */
export async function prepareEmailSignIn(email: string, privacyAccepted: boolean) {
  if(privacyAccepted!==true)return {ok:false as const,error:"Please accept the Privacy Policy before continuing."};
  const p = z.email().max(254).safeParse(email);
  if(!p.success)return {ok:false as const,error:"Enter a valid email address."};
  if(!(await issueSignupTicket(p.data, await clientIp())))return {ok:false as const,error:"Too many sign-in attempts. Please wait and try again."};
  return {ok:true as const};
}

/** The sign-up cap's own message when that's why sign-in failed, so the student knows what happened. */
const refusal = (message?: string) => SIGNUP_REFUSALS.find((r) => message?.includes(r)) ? message : undefined;

const Google = z.object({ credential: z.string().regex(/^[\w-]+\.[\w-]+\.[\w-]+$/).max(8192), nonce: z.uuid(), privacyAccepted:z.literal(true) });

/**
 * Finish Google sign-in on the server: Supabase checks Google's ID token (and our nonce) and the session cookies
 * are written here, HttpOnly, instead of by page scripts.
 */
export async function signInWithGoogle(input: z.input<typeof Google>) {
  const p = Google.safeParse(input);
  if (!p.success) return { ok: false as const };
  const { error } = await (await createClient()).auth.signInWithIdToken({ provider: "google", token: p.data.credential, nonce: p.data.nonce });
  return { ok: !error, error: refusal(error?.message) };
}

/** OAuth starts on the server so its PKCE verifier uses the same HttpOnly cookie handling as the session. */
export async function beginGoogleOAuth(privacyAccepted: boolean) {
  if(privacyAccepted!==true)return {ok:false as const,error:"Please accept the Privacy Policy before continuing."};
  const origin=(await headers()).get("origin");
  const allowed=new Set(["https://openprep.site","https://www.openprep.site","https://openprep-opal.vercel.app","https://idkwhattodoforthesat.site","https://www.idkwhattodoforthesat.site"]);
  if(!origin || (!allowed.has(origin) && !(process.env.NODE_ENV==="development" && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))))return {ok:false as const,error:"Open sign-in on openprep.site and try again."};
  const supabase=await createClient();
  const {data,error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${origin}/auth/callback?flow=google`,skipBrowserRedirect:true,queryParams:{prompt:"select_account"}}});
  if(error || !data.url)return {ok:false as const,error:"Google sign-in is unavailable. Please use the email sign-in link."};
  return {ok:true as const,url:data.url};
}
