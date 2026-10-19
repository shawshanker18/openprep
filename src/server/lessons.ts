import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { SKILL_BY_ID } from "@/content/taxonomy";

export type Lesson = { minutes: number | null; sections: { heading: string; md: string }[] };

/** Split lesson markdown (without frontmatter) into its `##` sections. The "fast way" section is not shown in lessons. */
export function lessonFromBody(content: string, minutes: number | null): Lesson {
  // Files are CRLF on Windows; the splitting below expects LF, so normalise before splitting.
  const sections = content.replace(/\r\n/g, "\n").split(/^## /m).slice(1).map((chunk) => {
    const nl = chunk.indexOf("\n");
    return { heading: chunk.slice(0, nl).trim(), md: chunk.slice(nl + 1).trim() };
  });
  return { minutes, sections: sections.filter(s => !/^The fast way/i.test(s.heading)) };
}

/** Lesson split into its `##` sections, or null if not written yet. Only known skill ids reach the filesystem. */
export async function getLesson(skillId: string): Promise<Lesson | null> {
  if (!SKILL_BY_ID[skillId]) return null;
  let raw: string;
  try { raw = await fs.readFile(path.join(process.cwd(), "content", "lessons", `${skillId}.md`), "utf8"); }
  catch { return null; }
  const { data, content } = matter(raw);
  return lessonFromBody(content, Number(data.minutes) || null);
}

/** The built-in lesson's raw `##` text and minutes, as the starting point when an admin customises a course version. */
export async function getLessonSource(skillId: string): Promise<{ body: string; minutes: number | null } | null> {
  if (!SKILL_BY_ID[skillId]) return null;
  try {
    const { data, content } = matter(await fs.readFile(path.join(process.cwd(), "content", "lessons", `${skillId}.md`), "utf8"));
    return { body: content.trim(), minutes: Number(data.minutes) || null };
  } catch { return null; }
}

export async function lessonExists(skillId: string) {
  if (!SKILL_BY_ID[skillId]) return false;
  return fs.access(path.join(process.cwd(), "content", "lessons", `${skillId}.md`)).then(() => true, () => false);
}

const DESMOS_DIR = () => path.join(process.cwd(), "content", "desmos");
export type DesmosLesson = { slug: string; title: string; order: number; expressions: string[]; md: string };

/** Desmos lessons from content/desmos/*.md (frontmatter: title, order, expressions). */
export async function listDesmosLessons(): Promise<DesmosLesson[]> {
  let files: string[] = [];
  try { files = (await fs.readdir(DESMOS_DIR())).filter((f) => f.endsWith(".md")); } catch { return []; }
  const lessons = await Promise.all(files.map(async (f) => {
    const { data, content } = matter(await fs.readFile(path.join(DESMOS_DIR(), f), "utf8"));
    return { slug: f.slice(0, -3), title: String(data.title ?? f), order: Number(data.order) || 99,
      expressions: Array.isArray(data.expressions) ? data.expressions.map(String) : [], md: content.trim() };
  }));
  return lessons.sort((a, b) => a.order - b.order);
}
