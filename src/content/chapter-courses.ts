/**
 * Chapter courses: for each Class 11 chapter below there is one course with two kinds of version.
 *   <id>-default  taught from the basics, for a student who has not covered the chapter (the course's fallback)
 *   <id>-covered  the SAT application route, for a student who has marked the chapter done at school
 * A student gets one version of each course, picked by the assignment rules (see engine/assignment.ts), so finishing
 * one chapter never changes another chapter's lessons.
 *
 * This list is only the starting data (the seed script and migration 0024 put it in the database). Courses live in the
 * `courses` and `course_skills` tables, and admins add and edit them in /admin/assignments. A skill belongs to at most
 * one course, so a lesson never has two candidate versions. A version with no saved text for a skill teaches the
 * built-in lesson file; admins can replace the text per version (course_version_lessons).
 */
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
