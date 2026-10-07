import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.openprep.site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/privacy", "/terms", "/login"].map((p) => ({ url: `${SITE}${p}`, changeFrequency: "monthly", priority: p ? 0.5 : 1 }));
}
