import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { CBSE_CHAPTERS } from "./cbse-chapters";
import { CHAPTER_COURSES } from "./chapter-courses";
import { SKILL_BY_ID } from "./taxonomy";

const coveredDir = path.resolve(import.meta.dirname, "../../content/chapter-courses/covered");

describe("chapter courses", () => {
  it("cover the five Class 11 chapters, each by a real chapter id", () => {
    expect(CHAPTER_COURSES.map((c) => c.chapterId).sort()).toEqual([
      "cbse-11-conic-sections", "cbse-11-relations-functions", "cbse-11-statistics", "cbse-11-straight-lines", "cbse-11-trigonometric-functions",
    ]);
    const known = new Set(CBSE_CHAPTERS.map((c) => c.id));
    for (const c of CHAPTER_COURSES) expect(known.has(c.chapterId)).toBe(true);
  });

  it("own real SAT skills, and no skill belongs to two courses", () => {
    const owned = CHAPTER_COURSES.flatMap((c) => c.skills);
    for (const s of owned) expect(SKILL_BY_ID[s]).toBeDefined();
    expect(new Set(owned).size).toBe(owned.length);
  });

  it("have a covered-route lesson for every skill they own, written as ## sections", () => {
    for (const skill of CHAPTER_COURSES.flatMap((c) => c.skills)) {
      const raw = fs.readFileSync(path.join(coveredDir, `${skill}.md`), "utf8");
      const { data, content } = matter(raw);
      expect(data.skill).toBe(skill);
      expect(Number(data.minutes)).toBeGreaterThan(0);
      expect(content.match(/^## \S/gm)?.length ?? 0).toBeGreaterThanOrEqual(4);
      expect(content).not.toMatch(/[–—]/); // authoring rule: no dashes used as punctuation
    }
  });
});
