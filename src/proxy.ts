// Refreshes the Supabase session cookie on every request. Route protection lives in layouts (spec 01 §5).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_OPTIONS } from "@/lib/supabase/cookies";
import { anonymousLimited } from "@/server/ratelimit";
import { DEVICE_COOKIE, issueDevice, verifyDevice, trustedIp } from "@/server/delivery-identity";

export async function proxy(request: NextRequest) {
  let device = request.cookies.get(DEVICE_COOKIE)?.value;
  const newDevice = !verifyDevice(device);
  if (newDevice) { device = issueDevice(); request.cookies.set(DEVICE_COOKIE, device); }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  const { data } = await supabase.auth.getClaims(); // verifies JWT locally when asymmetric signing is enabled and refreshes expired sessions
  const user = data?.claims?.sub && !data.claims.is_anonymous ? data.claims : null;
  // Protected layouts/actions still call getUser() to enforce server-side session revocation.
  if (newDevice) response.cookies.set(DEVICE_COOKIE, device!, { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", path:"/", maxAge:365*86_400 });
  // Signed-out writes (server actions, forms) are capped per IP before any of our code runs.
  const ip = trustedIp(request.headers) ?? "unknown-network";
  if (!user && request.method === "POST" && (await anonymousLimited(ip)))
    return new NextResponse("Too many requests.", { status: 429, headers: { "Retry-After": "60" } });
  // Only the landing and sign-in pages may appear in search results; nothing inside the app or its API.
  if (!["/", "/login"].includes(request.nextUrl.pathname)) response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
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
