import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    // The PKCE verifier lives where the sign-in was requested. No verifier here means the link was opened somewhere
    // else: usually the email app's browser after asking from the desktop/Android app, so hand the code back to it.
    const handOff = NextResponse.redirect(`${origin}/auth/open-app?code=${encodeURIComponent(code)}`);
    if (!request.cookies.getAll().some((c) => c.name.includes("-code-verifier"))) return handOff;
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
    // A leftover verifier from an older attempt in this browser: treat like a link meant for elsewhere.
    if (/verifier/i.test(error.message)) return handOff;
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
