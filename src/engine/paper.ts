// Fixed practice tests: four papers carved out of the test pool by a stable hash of the question id, so Practice Test 2
// is the same Practice Test 2 for everyone, every time. Pure functions; the server only supplies the pool.
import { assembleModule, moduleBlueprint, type PoolQ, type Route } from "./assemble";

export const PAPERS = [1, 2, 3, 4] as const;
export type Paper = (typeof PAPERS)[number];

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
export const paperOf = (questionId: string) => ((hash(questionId) % PAPERS.length) + 1) as Paper;

/** mulberry32: a small seeded generator, so assembly is repeatable. */
function seeded(seed: string) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One module of a paper. Module 2 (easy or hard) never repeats a Module 1 question of the same paper. `pool` is the
 * section's active test-pool questions; the module is a pure function of (paper, section, route, pool).
 * The pool is sorted by id and treated as never-seen, so a student's history can't change what the paper contains.
 */
export function paperModule<T extends PoolQ>(paper: Paper, section: "rw" | "math", route: Route, pool: T[]): T[] {
  const mine = pool.filter((q) => paperOf(q.id) === paper).map((q) => ({ ...q, lastSeenAt: null, reserved: false })).sort((a, b) => (a.id < b.id ? -1 : 1));
  const build = (r: Route, exclude: ReadonlySet<string>) => assembleModule(moduleBlueprint(section, r), mine, exclude, seeded(`${paper}:${section}:${r}`));
  const m1 = build("base", new Set());
  return route === "base" ? m1 : build(route, new Set(m1.map((q) => q.id)));
}
