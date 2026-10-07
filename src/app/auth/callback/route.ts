import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const google = searchParams.get("flow") === "google";
  const nativeEmail = searchParams.get("flow") === "app";
  if (searchParams.has("error")) {
    return NextResponse.redirect(`${origin}/login?error=${google ? "google" : "auth"}`);
  }
  if (code) {
    // A missing verifier can also mean a website link opened in another browser or on an old domain.
    // Only an explicitly marked native flow should offer an app handoff.
    const inApp = (request.headers.get("user-agent") ?? "").includes("OpenPrepApp");
    const handOff = NextResponse.redirect(nativeEmail && !inApp ? `${origin}/auth/open-app?flow=app&code=${encodeURIComponent(code)}` : `${origin}/login?error=email_browser`);
    if (!request.cookies.getAll().some((c) => c.name.includes("-code-verifier"))) return google ? NextResponse.redirect(`${origin}/login?error=google`) : handOff;
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
    // A leftover verifier from an older attempt in this browser: treat like a link meant for elsewhere.
    if (/verifier/i.test(error.message) && !google) return handOff;
  }
  return NextResponse.redirect(`${origin}/login?error=${google ? "google" : "auth"}`);
}
