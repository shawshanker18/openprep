/**
 * Chapter courses: for each Class 11 chapter below there is one course with two kinds of version.
 *   <id>-default  taught from the basics, for a student who has not covered the chapter (the course's fallback)
 *   <id>-covered  the SAT application route, for a student who has marked the chapter done at school
 * A student gets one version of each course, picked by the assignment rules (see engine/assignment.ts), so finishing
 * one chapter never changes another chapter's lessons.
 *
 * `skills` are the SAT skills whose lesson the course owns. A skill belongs to exactly one course (checked in the tests),
 * so a lesson never has two candidate versions. A version with no saved text for a skill teaches the built-in lesson
 * file; admins can replace the text per version (course_version_lessons).
 */
export type ChapterCourse = { id: string; chapterId: string; title: string; skills: string[] };

export const CHAPTER_COURSES: ChapterCourse[] = [
  { id: "straight-lines", chapterId: "cbse-11-straight-lines", title: "Straight Lines", skills: ["m-alg-linfunc", "m-alg-lin2"] },
  { id: "relations-functions", chapterId: "cbse-11-relations-functions", title: "Relations and Functions", skills: ["m-adv-nonlin-func"] },
  { id: "conic-sections", chapterId: "cbse-11-conic-sections", title: "Conic Sections", skills: ["m-geo-circles", "m-adv-nonlin-eq"] },
  { id: "trig-functions", chapterId: "cbse-11-trigonometric-functions", title: "Trigonometric Functions (unit circle)", skills: ["m-geo-trig"] },
  { id: "statistics", chapterId: "cbse-11-statistics", title: "Statistics", skills: ["m-psda-onevar", "m-psda-twovar"] },
];

export const COURSE_BY_ID = Object.fromEntries(CHAPTER_COURSES.map((c) => [c.id, c])) as Record<string, ChapterCourse>;
/** The course that owns a SAT skill's lesson, or undefined when the skill is not part of any chapter course. */
export const COURSE_OF_SKILL = new Map(CHAPTER_COURSES.flatMap((c) => c.skills.map((s) => [s, c] as const)));

export const defaultVersionId = (courseId: string) => `${courseId}-default`;
export const coveredVersionId = (courseId: string) => `${courseId}-covered`;
