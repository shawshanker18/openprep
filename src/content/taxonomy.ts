// The SAT skill taxonomy — single source of truth (spec 02 §2).
export type Section = "rw" | "math";
export type Skill = { id: string; section: Section; domain: DomainId; name: string; order: number };

export const DOMAINS = {
  "rw-ii":  { section: "rw",   name: "Information and Ideas",             weight: 0.26 },
  "rw-cs":  { section: "rw",   name: "Craft and Structure",               weight: 0.28 },
  "rw-ei":  { section: "rw",   name: "Expression of Ideas",               weight: 0.20 },
  "rw-sec": { section: "rw",   name: "Standard English Conventions",      weight: 0.26 },
  "m-alg":  { section: "math", name: "Algebra",                           weight: 0.35 },
  "m-adv":  { section: "math", name: "Advanced Math",                     weight: 0.35 },
  "m-psda": { section: "math", name: "Problem-Solving and Data Analysis", weight: 0.15 },
  "m-geo":  { section: "math", name: "Geometry and Trigonometry",         weight: 0.15 },
} as const satisfies Record<string, { section: Section; name: string; weight: number }>;
export type DomainId = keyof typeof DOMAINS;

const s = (id: string, domain: DomainId, name: string, order: number): Skill =>
  ({ id, domain, name, order, section: DOMAINS[domain].section });

export const SKILLS: Skill[] = [
  s("rw-ii-central",     "rw-ii",  "Central Ideas and Details", 1),
  s("rw-ii-evidence",    "rw-ii",  "Command of Evidence (Textual and Quantitative)", 2),
  s("rw-ii-inference",   "rw-ii",  "Inferences", 3),
  s("rw-cs-words",       "rw-cs",  "Words in Context", 1),
  s("rw-cs-structure",   "rw-cs",  "Text Structure and Purpose", 2),
  s("rw-cs-crosstext",   "rw-cs",  "Cross-Text Connections", 3),
  s("rw-ei-transitions", "rw-ei",  "Transitions", 1),
  s("rw-ei-synthesis",   "rw-ei",  "Rhetorical Synthesis", 2),
  s("rw-sec-boundaries", "rw-sec", "Boundaries (punctuation, sentence structure)", 1),
  s("rw-sec-form",       "rw-sec", "Form, Structure, and Sense (grammar)", 2),

  s("m-alg-lin1",        "m-alg",  "Linear Equations in One Variable", 1),
  s("m-alg-linfunc",     "m-alg",  "Linear Functions", 2),
  s("m-alg-lin2",        "m-alg",  "Linear Equations in Two Variables", 3),
  s("m-alg-systems",     "m-alg",  "Systems of Two Linear Equations", 4),
  s("m-alg-ineq",        "m-alg",  "Linear Inequalities", 5),
  s("m-adv-equiv",       "m-adv",  "Equivalent Expressions", 1),
  s("m-adv-nonlin-eq",   "m-adv",  "Nonlinear Equations and Systems (incl. quadratics)", 2),
  s("m-adv-nonlin-func", "m-adv",  "Nonlinear Functions (quadratic, exponential, polynomial)", 3),
  s("m-psda-ratios",     "m-psda", "Ratios, Rates, Proportions, Units", 1),
  s("m-psda-percent",    "m-psda", "Percentages", 2),
  s("m-psda-onevar",     "m-psda", "One-Variable Data: Distributions, Centre, Spread", 3),
  s("m-psda-twovar",     "m-psda", "Two-Variable Data: Models and Scatterplots", 4),
  s("m-psda-prob",       "m-psda", "Probability and Conditional Probability", 5),
  s("m-psda-inference",  "m-psda", "Inference from Sample Statistics, Margin of Error", 6),
  s("m-psda-claims",     "m-psda", "Evaluating Statistical Claims", 7),
  s("m-geo-area",        "m-geo",  "Area and Volume", 1),
  s("m-geo-lines",       "m-geo",  "Lines, Angles, and Triangles", 2),
  s("m-geo-trig",        "m-geo",  "Right Triangles and Trigonometry", 3),
  s("m-geo-circles",     "m-geo",  "Circles", 4),
];

export const SKILL_BY_ID: Record<string, Skill> = Object.fromEntries(SKILLS.map((k) => [k.id, k]));
export const skillsIn = (domain: string) => SKILLS.filter((k) => k.domain === domain);
export const skillWeight = (k: Skill) => DOMAINS[k.domain].weight / skillsIn(k.domain).length;

// Onboarding "topics studied" checklist → skills that get a small prior boost (spec 02 §2.1).
export const TOPICS: { id: string; label: string; skills: string[] }[] = [
  { id: "linear",     label: "Linear equations & graphs of lines", skills: ["m-alg-lin1", "m-alg-linfunc", "m-alg-lin2"] },
  { id: "systems",    label: "Simultaneous equations & inequalities", skills: ["m-alg-systems", "m-alg-ineq"] },
  { id: "quadratics", label: "Quadratics & factoring", skills: ["m-adv-equiv", "m-adv-nonlin-eq"] },
  { id: "functions",  label: "Functions, exponentials, polynomials", skills: ["m-adv-nonlin-func"] },
  { id: "percent",    label: "Ratios, percentages, rates", skills: ["m-psda-ratios", "m-psda-percent"] },
  { id: "stats",      label: "Statistics & probability", skills: ["m-psda-onevar", "m-psda-twovar", "m-psda-prob", "m-psda-inference", "m-psda-claims"] },
  { id: "geometry",   label: "Geometry: area, volume, angles, circles", skills: ["m-geo-area", "m-geo-lines", "m-geo-circles"] },
  { id: "trig",       label: "Trigonometry", skills: ["m-geo-trig"] },
];
