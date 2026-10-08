import { expect, it } from "vitest";
import { CBSE_CHAPTERS, skillsFromChapters } from "@/content/cbse-chapters";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { likelyCoveredSkills } from "./curriculum-coverage";

it("every chapter id is unique and every mapped skill exists", () => {
  expect(new Set(CBSE_CHAPTERS.map((c) => c.id)).size).toBe(CBSE_CHAPTERS.length);
  for (const ch of CBSE_CHAPTERS) for (const s of ch.skills) expect(SKILL_BY_ID[s], `${ch.id} -> ${s}`).toBeDefined();
  expect([9, 10, 11, 12].every((g) => CBSE_CHAPTERS.some((c) => c.grade === g))).toBe(true);
});

it("ticked CBSE chapters decide what is likely covered, instead of the grade guess", () => {
  const base = { curriculum: "cbse", grade: 12, subjects: ["Mathematics"], topicsStudied: [] as string[] };
  // Class 12 would guess lots; the student only ticked Quadratic Equations.
  const covered = likelyCoveredSkills({ ...base, chaptersDone: ["cbse-10-quadratic-equations"] });
  expect([...covered]).toEqual(["m-adv-nonlin-eq"]);
  // Nothing ticked: falls back to the board/grade guess.
  expect(likelyCoveredSkills({ ...base, chaptersDone: [] }).size).toBeGreaterThan(1);
  // Another board ignores chapters.
  expect(likelyCoveredSkills({ ...base, curriculum: "icse", chaptersDone: ["cbse-10-quadratic-equations"] }).has("m-adv-nonlin-eq")).toBe(true);
  expect(skillsFromChapters(["cbse-11-sets", "nope"]).size).toBe(0);
});
