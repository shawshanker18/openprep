import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Started in the desktop/Android app: the PKCE verifier lives in the app, so hand the code back to it.
  if (code && searchParams.get("app") === "1") return NextResponse.redirect(`${origin}/auth/open-app?code=${encodeURIComponent(code)}`);
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
