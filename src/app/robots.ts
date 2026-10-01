import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://openprep-opal.vercel.app";

/** Only the public pages are worth indexing; everything else needs an account. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/about", "/privacy", "/terms", "/login"], disallow: ["/api/", "/auth/", "/test/", "/dashboard", "/onboarding"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
