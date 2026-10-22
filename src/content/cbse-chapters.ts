/**
 * CBSE (NCERT) maths chapters for classes 9 to 12, each mapped to the SAT skills it already teaches.
 * A student who ticks a chapter is treated as having met those SAT skills: they are marked "Likely covered in school",
 * get a slightly higher starting estimate, and the lesson list says they can skim or skip them. A lesson is never removed:
 * the mapping is a guide, and only the student's practice answers change their actual level.
 *
 * Skill ids are the ones in taxonomy.ts. A chapter with no SAT skill (calculus, vectors, sets…) is still listed so a
 * student can tick everything they have done; it simply maps to nothing.
 */
/** `active: false` retires a chapter: rules that name it become invalid and are reported, never guessed around. */
export type CbseChapter = { id: string; grade: 9 | 10 | 11 | 12; title: string; skills: string[]; active?: boolean };

const c = (grade: 9 | 10 | 11 | 12, slug: string, title: string, skills: string[] = []): CbseChapter => ({ id: `cbse-${grade}-${slug}`, grade, title, skills });

export const CBSE_CHAPTERS: CbseChapter[] = [
  c(9, "number-systems", "Number Systems", ["m-adv-equiv"]),
  c(9, "polynomials", "Polynomials", ["m-adv-equiv"]),
  c(9, "coordinate-geometry", "Coordinate Geometry", ["m-alg-linfunc"]),
  c(9, "linear-equations-two-variables", "Linear Equations in Two Variables", ["m-alg-lin1", "m-alg-lin2", "m-alg-linfunc"]),
  c(9, "euclid", "Introduction to Euclid's Geometry"),
  c(9, "lines-angles", "Lines and Angles", ["m-geo-lines"]),
  c(9, "triangles", "Triangles", ["m-geo-lines"]),
  c(9, "quadrilaterals", "Quadrilaterals", ["m-geo-lines", "m-geo-area"]),
  c(9, "circles", "Circles", ["m-geo-circles"]),
  c(9, "herons-formula", "Heron's Formula", ["m-geo-area"]),
  c(9, "surface-areas-volumes", "Surface Areas and Volumes", ["m-geo-area"]),
  c(9, "statistics", "Statistics", ["m-psda-onevar"]),

  c(10, "real-numbers", "Real Numbers", ["m-adv-equiv"]),
  c(10, "polynomials", "Polynomials", ["m-adv-equiv", "m-adv-nonlin-func"]),
  c(10, "pair-linear-equations", "Pair of Linear Equations in Two Variables", ["m-alg-systems", "m-alg-lin2"]),
  c(10, "quadratic-equations", "Quadratic Equations", ["m-adv-nonlin-eq"]),
  c(10, "arithmetic-progressions", "Arithmetic Progressions", ["m-alg-linfunc"]),
  c(10, "triangles", "Triangles", ["m-geo-lines"]),
  c(10, "coordinate-geometry", "Coordinate Geometry", ["m-alg-linfunc", "m-geo-lines"]),
  c(10, "intro-trigonometry", "Introduction to Trigonometry", ["m-geo-trig"]),
  c(10, "applications-trigonometry", "Some Applications of Trigonometry", ["m-geo-trig"]),
  c(10, "circles", "Circles", ["m-geo-circles"]),
  c(10, "areas-related-to-circles", "Areas Related to Circles", ["m-geo-area", "m-geo-circles"]),
  c(10, "surface-areas-volumes", "Surface Areas and Volumes", ["m-geo-area"]),
  c(10, "statistics", "Statistics", ["m-psda-onevar"]),
  c(10, "probability", "Probability", ["m-psda-prob"]),

  c(11, "sets", "Sets"),
  c(11, "relations-functions", "Relations and Functions", ["m-adv-nonlin-func", "m-alg-linfunc"]),
  c(11, "trigonometric-functions", "Trigonometric Functions", ["m-geo-trig"]),
  c(11, "complex-quadratic", "Complex Numbers and Quadratic Equations", ["m-adv-nonlin-eq"]),
  c(11, "linear-inequalities", "Linear Inequalities", ["m-alg-ineq"]),
  c(11, "permutations-combinations", "Permutations and Combinations", ["m-psda-prob"]),
  c(11, "binomial-theorem", "Binomial Theorem", ["m-adv-equiv"]),
  c(11, "sequences-series", "Sequences and Series", ["m-adv-nonlin-func"]),
  c(11, "straight-lines", "Straight Lines", ["m-alg-linfunc", "m-alg-lin2", "m-geo-lines"]),
  c(11, "conic-sections", "Conic Sections", ["m-geo-circles", "m-adv-nonlin-eq"]),
  c(11, "three-d-geometry", "Introduction to Three Dimensional Geometry"),
  c(11, "limits-derivatives", "Limits and Derivatives"),
  c(11, "statistics", "Statistics", ["m-psda-onevar", "m-psda-twovar"]),
  c(11, "probability", "Probability", ["m-psda-prob"]),

  c(12, "relations-functions", "Relations and Functions", ["m-adv-nonlin-func"]),
  c(12, "inverse-trigonometric", "Inverse Trigonometric Functions", ["m-geo-trig"]),
  c(12, "matrices", "Matrices", ["m-alg-systems"]),
  c(12, "determinants", "Determinants", ["m-alg-systems"]),
  c(12, "continuity-differentiability", "Continuity and Differentiability"),
  c(12, "applications-derivatives", "Application of Derivatives"),
  c(12, "integrals", "Integrals"),
  c(12, "applications-integrals", "Application of Integrals"),
  c(12, "differential-equations", "Differential Equations"),
  c(12, "vector-algebra", "Vector Algebra"),
  c(12, "three-d-geometry", "Three Dimensional Geometry"),
  c(12, "linear-programming", "Linear Programming", ["m-alg-ineq", "m-alg-systems"]),
  c(12, "probability", "Probability", ["m-psda-prob"]),
];

export const CBSE_CHAPTER_IDS = CBSE_CHAPTERS.map((ch) => ch.id) as [string, ...string[]];
const BY_ID = new Map(CBSE_CHAPTERS.map((ch) => [ch.id, ch]));

/** SAT skills covered by the ticked chapters (unknown ids are ignored). */
export const skillsFromChapters = (ids: readonly string[]): Set<string> =>
  new Set(ids.flatMap((id) => BY_ID.get(id)?.skills ?? []));

/**
 * Chapters a CBSE student has already covered just by being in their class: all of classes 9 up to the one before
 * their own (a Class 11 student has done every Class 9 and 10 chapter). Their own class is not assumed.
 */
export const chaptersBelowGrade = (grade: number | null | undefined): string[] =>
  grade == null ? [] : CBSE_CHAPTERS.filter((ch) => ch.grade < grade).map((ch) => ch.id);

/** What the student ticked plus everything from the classes below theirs. */
export const completedChapters = (ticked: readonly string[], grade: number | null | undefined): string[] =>
  [...new Set([...chaptersBelowGrade(grade), ...ticked])];

/** The Class 11 chapters that have a course of their own. These are the ones every CBSE student is asked about. */
export const COURSE_CHAPTER_IDS: readonly string[] = [
  "cbse-11-relations-functions", "cbse-11-trigonometric-functions", "cbse-11-straight-lines",
  "cbse-11-linear-inequalities", "cbse-11-conic-sections", "cbse-11-statistics",
];

/** The chapters the student is asked about: the course chapters, whatever their class. */
export const askedChapters = (): CbseChapter[] => CBSE_CHAPTERS.filter((ch) => COURSE_CHAPTER_IDS.includes(ch.id));

/**
 * What is stored for a student's chapters. Only CBSE maths students keep chapter ticks (course chapters only, plus the
 * assumption that Classes below their own are done, taken from the profile grade). Every other curriculum stores none,
 * so they get the default courses.
 */
export const savedChapters = (ticked: readonly string[], grade: number | null | undefined, curriculum: string | null | undefined, subjects: readonly string[]): string[] => {
  if (!asksChapters(curriculum, subjects)) return [];
  return completedChapters(ticked.filter((id) => COURSE_CHAPTER_IDS.includes(id)), grade);
};

/** Chapters are asked of CBSE students who study Mathematics, whatever their class: coverage comes from what they ticked. */
export const asksChapters = (curriculum: string | null | undefined, subjects: readonly string[]): boolean =>
  curriculum === "cbse" && subjects.includes("Mathematics");

/** CBSE Classes 9 and 10 are not asked which subjects they study. Everyone else is. */
export const asksSubjects = (curriculum: string | null | undefined, grade: number | null | undefined): boolean =>
  !(curriculum === "cbse" && (grade === 9 || grade === 10));
