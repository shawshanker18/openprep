import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Email templates send a one-time token hash here, so links also work in another browser. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  if (searchParams.get("type") === "email" && tokenHash && /^[A-Za-z0-9_-]{16,256}$/.test(tokenHash)) {
    const { error } = await (await createClient()).auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
