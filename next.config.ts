import type { NextConfig } from "next";

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const dev = process.env.NODE_ENV === "development";
// Inline scripts are allowed (Next's bootstrap) but only our origin, Google sign-in and GeoGebra may load script.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://accounts.google.com/gsi/client https://www.geogebra.org https://*.geogebra.org https://cdn.geogebra.org`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style https://www.geogebra.org https://*.geogebra.org https://cdn.geogebra.org",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://www.geogebra.org https://*.geogebra.org https://cdn.geogebra.org",
  "font-src 'self' data: https://www.geogebra.org https://*.geogebra.org https://cdn.geogebra.org",
  `connect-src 'self' ${supabase} ${supabase.replace("https://", "wss://")} https://accounts.google.com/gsi/ https://www.geogebra.org https://*.geogebra.org https://cdn.geogebra.org`,
  "frame-src https://accounts.google.com/gsi/ https://www.geogebra.org https://*.geogebra.org https://cdn.geogebra.org",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  // Don't advertise the framework in an X-Powered-By header.
  poweredByHeader: false,
  // No source maps in production: the original source can't be read from the browser.
  productionBrowserSourceMaps: false,
  // The Android emulator reaches the dev server as 10.0.2.2 (dev only; ignored in production builds).
  allowedDevOrigins: ["10.0.2.2"],
  // Lessons are read from disk at request time; make sure they ship with the server bundle.
  outputFileTracingIncludes: {
    "/skills/*": ["./content/lessons/**/*.md"],
    "/dashboard": ["./content/**/*.md"],
    "/plan": ["./content/**/*.md"],
    "/desmos/*": ["./content/desmos/**/*.md"],
    "/start": ["./content/desmos/**/*.md"],
    "/start/*": ["./content/**/*.md"],
  },
  // The SAT course was replaced by Start from scratch; old links land on the new path.
  async redirects() {
    return [
      { source: "/course", destination: "/start", permanent: false },
      { source: "/course/:path*", destination: "/start", permanent: false },
    ];
  },
  // Security headers (spec 05 §5).
  async headers() {
    return [{
      source: "/sw.js",
      headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
    }, {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: csp },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};

export default nextConfig;
