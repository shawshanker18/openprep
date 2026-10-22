/**
 * CBSE coverage of each SAT Math skill, from the CBSE 9-11 to SAT Math crosswalk (2026-27), section "SAT skills and
 * remaining lessons". The crosswalk rates each skill and states what CBSE teaches and what the SAT adds beyond it.
 *
 *  school:
 *   direct   CBSE chapters teach the shared core; the SAT adds applications and practice bridges
 *   partial  CBSE teaches only a restricted part, or the skill is an embedded prerequisite, or assessment scope is limited
 *   none     The selected CBSE 9-11 maths syllabi do not establish the skill: dedicated SAT lessons are needed
 *
 * This drives what the app may call "covered in school" (lib/curriculum-coverage) and the CBSE revision view in a
 * lesson (components/lesson-study-view). A "none" skill is never school revision: it is taught fully.
 */
export type SchoolCoverage = "none" | "partial" | "direct";

export type CbseSkillCoverage = {
  skillId: string;
  school: SchoolCoverage;
  /** What the CBSE chapters actually teach, one sentence. Empty for "none". */
  schoolSummary: string;
  /** What the SAT asks beyond the CBSE syllabus, from the crosswalk's additional-teaching column. */
  satAdds: string[];
};

export const CBSE_SKILL_COVERAGE: Record<string, CbseSkillCoverage> = {
  "m-alg-lin1": {
    skillId: "m-alg-lin1", school: "partial",
    schoolSummary: "Class 9 and 10 linear-equation work uses these skills, though no chapter teaches one-variable equations on their own.",
    satAdds: ["isolating a variable in contextual and literal equations", "interpreting coefficients and parameters", "solution counts"],
  },
  "m-alg-linfunc": {
    skillId: "m-alg-linfunc", school: "direct",
    schoolSummary: "Class 9 polynomials and progressions, Class 10 arithmetic progressions and Class 11 Straight Lines teach slope, intercepts and linear models.",
    satAdds: ["function notation with graphs and tables", "reading rates and initial values in context", "interpreting parameter changes and constraints"],
  },
  "m-alg-lin2": {
    skillId: "m-alg-lin2", school: "direct",
    schoolSummary: "Class 9 Linear Equations in Two Variables and Class 11 Straight Lines teach every equation form of a line.",
    satAdds: ["equivalent forms including standard form", "unknown constants", "parallel and perpendicular conditions in SAT wording"],
  },
  "m-alg-systems": {
    skillId: "m-alg-systems", school: "direct",
    schoolSummary: "Class 9 linear equations in two variables and Class 10 Pair of Linear Equations cover substitution, elimination and solution counts.",
    satAdds: ["modelling two constraints from word problems", "parameters producing one, no or infinitely many solutions"],
  },
  "m-alg-ineq": {
    skillId: "m-alg-ineq", school: "partial",
    schoolSummary: "Class 11 Linear Inequalities covers one-variable inequalities; two-variable inequalities are formative-only in the 2026-27 syllabus.",
    satAdds: ["translating verbal bounds", "testing points in the plane", "interpreting the feasible region of a system"],
  },
  "m-adv-equiv": {
    skillId: "m-adv-equiv", school: "direct",
    schoolSummary: "Class 9 algebraic identities, Class 10 Real Numbers and Class 11 operations on functions cover expansion, factoring and simplification.",
    satAdds: ["rational exponents and radicals", "rational expressions with excluded values", "forms chosen to reveal useful structure"],
  },
  "m-adv-nonlin-eq": {
    skillId: "m-adv-nonlin-eq", school: "partial",
    schoolSummary: "Class 10 Quadratic Equations covers factoring and formula methods for real roots; complex roots are outside the SAT anyway.",
    satAdds: ["completing the square", "absolute-value, rational and radical equations with extraneous roots", "factored higher-degree equations", "linear and nonlinear systems", "rearranging formulas to isolate a chosen variable"],
  },
  "m-adv-nonlin-func": {
    skillId: "m-adv-nonlin-func", school: "direct",
    schoolSummary: "Class 11 Relations and Functions and Sequences and Series cover notation, graphs and geometric progressions, and Conic Sections covers the upright parabola.",
    satAdds: ["vertex and maximum or minimum interpretation", "transformations and equivalent forms", "exponential growth factors in context", "connections among tables, graphs and formulas"],
  },
  "m-psda-ratios": {
    skillId: "m-psda-ratios", school: "partial",
    schoolSummary: "Class 9 and 10 geometry, similarity and mensuration give ratio contexts; the underlying arithmetic predates Class 9.",
    satAdds: ["unit rates and derived units", "scale drawings", "density", "multistep and multidimensional unit conversions"],
  },
  "m-psda-percent": {
    skillId: "m-psda-percent", school: "none",
    schoolSummary: "",
    satAdds: ["part-whole and reverse percentages", "successive change and multipliers", "interest, discounts and taxes", "percentages of 100 or more"],
  },
  "m-psda-onevar": {
    skillId: "m-psda-onevar", school: "direct",
    schoolSummary: "Class 9 and 10 statistics cover mean, median and grouped data; Class 11 adds range and standard deviation.",
    satAdds: ["histograms, dot plots and box plots", "outlier effects on centre", "reasoning about changed data sets", "comparing centre and spread"],
  },
  "m-psda-twovar": {
    skillId: "m-psda-twovar", school: "none",
    schoolSummary: "",
    satAdds: ["scatterplot interpretation", "fitted lines and predictions", "quadratic and exponential data models", "comparing linear and exponential growth"],
  },
  "m-psda-prob": {
    skillId: "m-psda-prob", school: "partial",
    schoolSummary: "Class 9 and 10 Probability and Class 11 event operations cover basic probability, complements, and/or events and sample spaces.",
    satAdds: ["one- and two-way frequency tables", "area models and relative frequency", "conditional probability with the correct restricted denominator"],
  },
  "m-psda-inference": {
    skillId: "m-psda-inference", school: "none",
    schoolSummary: "",
    satAdds: ["estimating population quantities from sample means and proportions", "margin of error", "the effect of sample size"],
  },
  "m-psda-claims": {
    skillId: "m-psda-claims", school: "none",
    schoolSummary: "",
    satAdds: ["random sampling versus random assignment", "observational versus experimental evidence", "causal claims and confounding"],
  },
  "m-geo-area": {
    skillId: "m-geo-area", school: "direct",
    schoolSummary: "Class 9 and 10 mensuration cover perimeter, area, surface area and volume.",
    satAdds: ["composite figures", "missing dimensions", "unit changes", "length, area and volume scale factors"],
  },
  "m-geo-lines": {
    skillId: "m-geo-lines", school: "direct",
    schoolSummary: "Class 9 lines, angles and congruence and Class 10 similarity cover angle facts and triangle conditions.",
    satAdds: ["applications with sufficient information", "theorem conditions in question form"],
  },
  "m-geo-trig": {
    skillId: "m-geo-trig", school: "direct",
    schoolSummary: "Class 10 trigonometric ratios and applications and the restricted Class 11 trigonometry cover ratios, radians and the unit circle.",
    satAdds: ["Pythagorean applications in varied contexts", "45-45-90 and 30-60-90 triangles", "complementary-angle relationships in varied contexts"],
  },
  "m-geo-circles": {
    skillId: "m-geo-circles", school: "direct",
    schoolSummary: "Class 9 and 10 circles cover arcs, sectors and tangents; Class 11 adds radians, the unit circle and circle equations.",
    satAdds: ["integrated degree-radian and arc questions", "circle-equation transformations", "recovering centre and radius from general form"],
  },
};
