export type ChapterCourse = { id: string; chapterId: string; title: string; skills: string[] };

export const CHAPTER_COURSES: ChapterCourse[] = [
  { id: "straight-lines", chapterId: "cbse-11-straight-lines", title: "Straight Lines", skills: ["m-alg-linfunc", "m-alg-lin2"] },
  { id: "relations-functions", chapterId: "cbse-11-relations-functions", title: "Relations and Functions", skills: ["m-adv-nonlin-func"] },
  { id: "conic-sections", chapterId: "cbse-11-conic-sections", title: "Conic Sections", skills: ["m-geo-circles", "m-adv-nonlin-eq"] },
  { id: "trig-functions", chapterId: "cbse-11-trigonometric-functions", title: "Trigonometric Functions (unit circle)", skills: ["m-geo-trig"] },
  { id: "statistics", chapterId: "cbse-11-statistics", title: "Statistics", skills: ["m-psda-onevar", "m-psda-twovar"] },
];

export const defaultVersionId = (courseId: string) => `${courseId}-default`;
export const coveredVersionId = (courseId: string) => `${courseId}-covered`;
