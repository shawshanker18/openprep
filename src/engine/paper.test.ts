import { expect, it } from "vitest";
import { moduleBlueprint, type PoolQ } from "./assemble";
import { PAPERS, paperModule, paperOf } from "./paper";

const DOMAINS = { math: ["m-alg", "m-adv", "m-psda", "m-geo"], rw: ["rw-cs", "rw-ii", "rw-sec", "rw-ei"] } as const;
const bank = (section: "math" | "rw", n = 1600): PoolQ[] => Array.from({ length: n }, (_, i) => ({
  id: `${section}-${i}`, skillId: `${DOMAINS[section][i % 4]}-skill`, domain: DOMAINS[section][i % 4]!, difficulty: ((i % 3) + 1) as 1 | 2 | 3,
  type: i % 5 === 0 ? "spr" : "mcq", lastSeenAt: null,
}));
const ids = (qs: PoolQ[]) => qs.map((q) => q.id);

it("a paper is the same module every time, whatever order or history the pool arrives in", () => {
  const pool = bank("math");
  const seen = pool.map((q, i) => (i % 2 ? { ...q, lastSeenAt: new Date() } : q)).reverse();
  expect(ids(paperModule(2, "math", "hard", seen))).toEqual(ids(paperModule(2, "math", "hard", pool)));
});

it("each module has its full question count and only that paper's questions", () => {
  for (const section of ["math", "rw"] as const) for (const route of ["base", "easy", "hard"] as const) {
    const qs = paperModule(3, section, route, bank(section));
    expect(qs).toHaveLength(moduleBlueprint(section, route).count);
    expect(qs.every((q) => paperOf(q.id) === 3)).toBe(true);
  }
});

it("module 2 never repeats a module 1 question of the same paper, and easy and hard differ in difficulty", () => {
  const pool = bank("rw");
  const m1 = new Set(ids(paperModule(1, "rw", "base", pool)));
  const easy = paperModule(1, "rw", "easy", pool), hard = paperModule(1, "rw", "hard", pool);
  expect([...ids(easy), ...ids(hard)].some((id) => m1.has(id))).toBe(false);
  const avg = (qs: PoolQ[]) => qs.reduce((a, q) => a + q.difficulty, 0) / qs.length;
  expect(avg(hard)).toBeGreaterThan(avg(easy));
});

it("the four papers share no questions and each is a quarter of the pool", () => {
  const pool = bank("math");
  const counts = PAPERS.map((n) => pool.filter((q) => paperOf(q.id) === n).length);
  expect(counts.every((c) => c > 300 && c < 500)).toBe(true);
  const all = PAPERS.flatMap((n) => ids(paperModule(n, "math", "base", pool)));
  expect(new Set(all).size).toBe(all.length);
});
