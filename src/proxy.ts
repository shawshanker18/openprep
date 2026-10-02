// Refreshes the Supabase session cookie on every request. Route protection lives in layouts (spec 01 §5).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_OPTIONS } from "@/lib/supabase/cookies";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser(); // verifies the session and refreshes it if needed
  // The landing page is static; signed-in visitors go straight to the app from here instead.
  const devUser = process.env.NODE_ENV === "development" && !!process.env.DEV_USER_ID;
  if (request.nextUrl.pathname === "/" && (user || devUser)) {
    const to = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.getAll().forEach((c) => to.cookies.set(c)); // keep any refreshed session cookies
    return to;
  }
  return response;
}

export const config = {
  // Public pages with no account data (about, privacy, terms, security, .well-known) skip the session check.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|api/cron/|figures/|\\.well-known/|about$|privacy$|terms$|security$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
