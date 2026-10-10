import type { MetadataRoute } from "next";
import { SKILLS } from "@/content/taxonomy";
import { lessonExists } from "@/server/lessons";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.openprep.site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lessons = (await Promise.all(SKILLS.map(async (k) => ((await lessonExists(k.id)) ? k.id : null)))).filter((id): id is string => !!id);
  const now = new Date();
  const pages = [["/", 1, "weekly"], ["/cbse-sat-prep", 0.9, "weekly"], ["/sat-math", 0.9, "weekly"], ["/sat-reading-writing", 0.9, "weekly"], ["/sat-practice-tests", 0.9, "weekly"], ["/learn", 0.9, "weekly"], ...lessons.map((id) => [`/learn/${id}`, 0.8, "monthly"] as const),
    ["/about", 0.5, "monthly"], ["/security", 0.4, "monthly"], ["/privacy", 0.3, "monthly"], ["/terms", 0.3, "monthly"], ["/login", 0.5, "monthly"]] as const;
  return pages.map(([p, priority, changeFrequency]) => ({ url: `${SITE}${p}`, lastModified: now, changeFrequency, priority }));
}
