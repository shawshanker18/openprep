import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { SKILL_BY_ID } from "@/content/taxonomy";

/** Lesson split into its `##` sections, or null if not written yet. Only known skill ids reach the filesystem. */
export async function getLesson(skillId: string) {
  if (!SKILL_BY_ID[skillId]) return null;
  let raw: string;
  try { raw = await fs.readFile(path.join(process.cwd(), "content", "lessons", `${skillId}.md`), "utf8"); }
  catch { return null; }
  const { data, content } = matter(raw);
  const sections = content.split(/^## /m).slice(1).map((chunk) => {
    const nl = chunk.indexOf("\n");
    return { heading: chunk.slice(0, nl).trim(), md: chunk.slice(nl + 1).trim() };
  });
  return { minutes: Number(data.minutes) || null, sections };
}

export async function lessonExists(skillId: string) {
  if (!SKILL_BY_ID[skillId]) return false;
  return fs.access(path.join(process.cwd(), "content", "lessons", `${skillId}.md`)).then(() => true, () => false);
}
