import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lessons are read from disk at request time; make sure they ship with the server bundle.
  outputFileTracingIncludes: {
    "/skills/*": ["./content/lessons/**/*.md"],
    "/dashboard": ["./content/**/*.md"],
    "/plan": ["./content/**/*.md"],
    "/desmos/*": ["./content/desmos/**/*.md"],
  },
  // Security headers (spec 05 §5). ponytail: no CSP yet — add one in report-only mode first when needed.
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
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};

export default nextConfig;
