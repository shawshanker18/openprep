import { expect, it } from "vitest";
import { CBSE_CHAPTERS, asksChapters, asksSubjects, askedChapters, chaptersBelowGrade, completedChapters, savedChapters, skillsFromChapters } from "@/content/cbse-chapters";
import { CBSE_SKILL_COVERAGE } from "@/content/cbse-skill-coverage";
import { SKILLS, SKILL_BY_ID } from "@/content/taxonomy";
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

it("the course chapters are asked of every CBSE maths student, whatever their class; ticks come from the profile", () => {
  expect(askedChapters().map((c) => c.id).sort()).toEqual([
    "cbse-11-conic-sections", "cbse-11-linear-inequalities", "cbse-11-relations-functions",
    "cbse-11-statistics", "cbse-11-straight-lines", "cbse-11-trigonometric-functions",
  ]);
  expect(askedChapters().every((c) => c.grade === 11)).toBe(true);
  // Only course chapters can be ticked; the below-class assumption comes from the profile grade.
  const saved = savedChapters(["cbse-11-statistics", "cbse-11-sets"], 11, "cbse", ["Mathematics"]);
  expect(saved).toContain("cbse-11-statistics");
  expect(saved).toContain("cbse-10-polynomials");
  expect(saved).not.toContain("cbse-11-sets");
  expect(savedChapters(["cbse-11-statistics"], 12, "cbse", ["Mathematics"])).toContain("cbse-11-statistics");
  // A non-course tick is ignored, but the below-class assumption still applies.
  expect(savedChapters(["cbse-10-polynomials"], 10, "cbse", ["Mathematics"])).toEqual(chaptersBelowGrade(10));
  expect(savedChapters(["cbse-11-statistics"], 11, "icse", ["Mathematics"])).toEqual([]);
  // Chapters are asked only when Mathematics is studied, never based on the class.
  expect(asksChapters("cbse", ["Physics"])).toBe(false);
  expect(savedChapters(["cbse-11-statistics"], 11, "cbse", ["Physics"])).toEqual([]);
  expect(asksChapters("cbse", ["Mathematics", "Physics"])).toBe(true);
});

it("CBSE classes 9 and 10 are not asked which subjects they study", () => {
  expect(asksSubjects("cbse", 9)).toBe(false);
  expect(asksSubjects("cbse", 10)).toBe(false);
  expect(asksSubjects("cbse", 11)).toBe(true);
  expect(asksSubjects("icse", 9)).toBe(true);
});

it("every SAT math skill has one crosswalk coverage entry, and no other skill does", () => {
  const math = SKILLS.filter((s) => s.section === "math").map((s) => s.id);
  expect(Object.keys(CBSE_SKILL_COVERAGE).sort()).toEqual(math.sort());
  for (const entry of Object.values(CBSE_SKILL_COVERAGE)) {
    expect(["none", "partial", "direct"]).toContain(entry.school);
    expect(entry.satAdds.length).toBeGreaterThan(0);
    expect(entry.school === "none" ? "" : entry.schoolSummary).toBe(entry.schoolSummary); // none has no summary, others have one
  }
});

it("skills the crosswalk says CBSE never teaches are never 'covered in school', whatever was ticked", () => {
  const never = ["m-psda-inference", "m-psda-claims", "m-psda-percent", "m-psda-twovar"];
  // A Class 12 CBSE student who ticked the statistics topic: the below-grade assumption plus their own tick still
  // cannot claim the crosswalk's "dedicated lessons needed" skills.
  const p = { curriculum: "cbse", grade: 12, subjects: ["Mathematics"], topicsStudied: ["stats"], chaptersDone: [] };
  for (const id of never) expect(likelyCoveredSkills(p).has(id), id).toBe(false);
  // The chapters assumption still covers what school genuinely teaches.
  expect(likelyCoveredSkills({ ...p, topicsStudied: [] }).has("m-geo-trig")).toBe(true); // Class 11 chapter, assumed at grade 12
  expect(likelyCoveredSkills({ ...p, topicsStudied: [] }).has("m-psda-onevar")).toBe(true); // Class 11 Statistics, direct overlap
  // Every skill the coverage map claims as chapter-taught is reachable from real chapters; embedded skills like
  // m-psda-ratios (taught inside geometry and mensuration, never as a chapter) are correctly unmapped.
  for (const entry of Object.values(CBSE_SKILL_COVERAGE)) {
    if (entry.school === "none") continue;
    const mapped = CBSE_CHAPTERS.some((c) => c.skills.includes(entry.skillId));
    if (mapped) expect(skillsFromChapters(CBSE_CHAPTERS.filter((c) => c.skills.includes(entry.skillId)).map((c) => c.id)).has(entry.skillId), entry.skillId).toBe(true);
    else expect(entry.school, entry.skillId).toBe("partial");
  }
  expect(SKILL_BY_ID["m-psda-inference"]).toBeDefined();
});

