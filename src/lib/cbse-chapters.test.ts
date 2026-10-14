import { expect, it } from "vitest";
import { CBSE_CHAPTERS, askedChapters, chaptersBelowGrade, completedChapters, savedChapters, skillsFromChapters } from "@/content/cbse-chapters";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { likelyCoveredSkills } from "./curriculum-coverage";

it("every chapter id is unique and every mapped skill exists", () => {
  expect(new Set(CBSE_CHAPTERS.map((c) => c.id)).size).toBe(CBSE_CHAPTERS.length);
  for (const ch of CBSE_CHAPTERS) for (const s of ch.skills) expect(SKILL_BY_ID[s], `${ch.id} -> ${s}`).toBeDefined();
  expect([9, 10, 11, 12].every((g) => CBSE_CHAPTERS.some((c) => c.grade === g))).toBe(true);
});

it("ticked CBSE chapters decide what is likely covered, instead of the grade guess", () => {
  const base = { curriculum: "cbse", grade: 10, subjects: ["Mathematics"], topicsStudied: [] as string[] };
  // A Class 10 student has done Class 9; from Class 10 they only ticked Quadratic Equations.
  const covered = likelyCoveredSkills({ ...base, chaptersDone: ["cbse-10-quadratic-equations"] });
  expect(covered.has("m-adv-nonlin-eq")).toBe(true);
  expect(covered.has("m-geo-circles")).toBe(true); // Class 9 Circles, assumed
  expect(covered.has("m-geo-trig")).toBe(false); // Class 10 trigonometry not ticked
  // Nothing ticked: falls back to the board/grade guess.
  expect(likelyCoveredSkills({ ...base, chaptersDone: [] }).size).toBeGreaterThan(1);
  // Another board ignores chapters.
  expect(likelyCoveredSkills({ ...base, curriculum: "icse", chaptersDone: ["cbse-10-quadratic-equations"] }).has("m-adv-nonlin-eq")).toBe(true);
  expect(skillsFromChapters(["cbse-11-sets", "nope"]).size).toBe(0);
});

it("a student in class 11 is assumed to have finished every class 9 and 10 chapter, class 12 every class 9, 10 and 11 chapter", () => {
  const ids11 = chaptersBelowGrade(11);
  expect(ids11.length).toBe(CBSE_CHAPTERS.filter((c) => c.grade === 9 || c.grade === 10).length);
  expect(ids11.every((id) => /^cbse-(9|10)-/.test(id))).toBe(true);
  expect(chaptersBelowGrade(12).some((id) => id.startsWith("cbse-11-"))).toBe(true);
  expect(chaptersBelowGrade(12).some((id) => id.startsWith("cbse-12-"))).toBe(false);
  expect(chaptersBelowGrade(9)).toEqual([]);
  expect(completedChapters(["cbse-11-sets"], 11)).toContain("cbse-11-sets");
  const covered = likelyCoveredSkills({ curriculum: "cbse", grade: 11, subjects: ["Mathematics"], topicsStudied: [], chaptersDone: [] });
  expect(covered.has("m-psda-prob")).toBe(true); // Class 10 Probability, assumed with nothing ticked
});

it("only Class 11 is asked, for its six course chapters; other classes store no chapters", () => {
  expect(askedChapters(11).map((c) => c.id).sort()).toEqual([
    "cbse-11-conic-sections", "cbse-11-linear-inequalities", "cbse-11-relations-functions",
    "cbse-11-statistics", "cbse-11-straight-lines", "cbse-11-trigonometric-functions",
  ]);
  expect(askedChapters(9)).toEqual([]);
  expect(askedChapters(10)).toEqual([]);
  expect(askedChapters(12)).toEqual([]);
  // Class 11 keeps the Class 9 and 10 assumption, but only course chapters can be ticked.
  const saved = savedChapters(["cbse-11-statistics", "cbse-11-sets"], 11, "cbse");
  expect(saved).toContain("cbse-11-statistics");
  expect(saved).toContain("cbse-10-polynomials");
  expect(saved).not.toContain("cbse-11-sets");
  expect(savedChapters(["cbse-10-polynomials"], 10, "cbse")).toEqual([]);
  expect(savedChapters(["cbse-11-statistics"], 11, "icse")).toEqual([]);
});
