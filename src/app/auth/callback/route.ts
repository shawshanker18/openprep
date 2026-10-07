import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const google = searchParams.get("flow") === "google";
  if (searchParams.has("error")) return NextResponse.redirect(`${origin}/login?error=google`);
  if (code) {
    // The PKCE verifier lives where the sign-in was requested. No verifier here means the link was opened somewhere
    // else: usually the email app's browser after asking from the desktop/Android app, so hand the code back to it.
    // Already inside the app: handing off to the app makes no sense, so a failed code is just an expired link.
    const inApp = (request.headers.get("user-agent") ?? "").includes("OpenPrepApp");
    const handOff = NextResponse.redirect(inApp ? `${origin}/login?error=auth` : `${origin}/auth/open-app?code=${encodeURIComponent(code)}`);
    if (!request.cookies.getAll().some((c) => c.name.includes("-code-verifier"))) return google ? NextResponse.redirect(`${origin}/login?error=google`) : handOff;
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
    // A leftover verifier from an older attempt in this browser: treat like a link meant for elsewhere.
    if (/verifier/i.test(error.message) && !google) return handOff;
  }
  return NextResponse.redirect(`${origin}/login?error=${google ? "google" : "auth"}`);
}
