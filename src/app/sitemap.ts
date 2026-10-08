import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.openprep.site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/security", "/privacy", "/terms", "/login"].map((p) => ({ url: `${SITE}${p}`, lastModified: new Date(), changeFrequency: p ? "monthly" : "weekly", priority: p ? 0.5 : 1 }));
}
