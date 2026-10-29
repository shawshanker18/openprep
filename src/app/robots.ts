import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.openprep.site";

/** Only the public pages are worth indexing; everything else needs an account. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*", allow: ["/", "/about", "/learn", "/cbse-sat-prep", "/sat-math", "/sat-reading-writing", "/sat-practice-tests", "/privacy", "/terms", "/login", "/security"],
      // Everything inside the app (and paths that don't exist here, in case a crawler guesses them).
      disallow: ["/api/", "/trpc/", "/auth/", "/test/", "/tests", "/practice", "/question-bank", "/dashboard", "/onboarding", "/plan",
        "/progress", "/analysis", "/mistakes", "/bookmarks", "/skills", "/start", "/course", "/desmos", "/settings", "/account", "/admin", "/dev/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
