// 
// writes are covered by server-side tests once that layer exists.
import { describe, expect, it } from "vitest";
import {
  evaluateAssignment, exprProblem, priorityTies, validateRule, type AssignmentRule, type ChapterInfo, type CourseVersionInfo, type EvaluationInput,
} from "./assignment";

const NOW = new Date("2026-10-12T10:00:00Z");
const chapters = [
  { id: "cbse-9-a", grade: 9 as const, active: true },
  { id: "cbse-9-b", grade: 9 as const, active: true },
  { id: "cbse-10-a", grade: 10 as const, active: true },
  { id: "cbse-11-a", grade: 11 as const, active: true },
  { id: "cbse-10-retired", grade: 10 as const, active: false },
];
const versions = [
  { id: "v1", published: true },
  { id: "v2", published: true },
  { id: "v-draft", published: false },
  { id: "fallback", published: true },
];
const rule = (over: Partial<AssignmentRule> & Pick<AssignmentRule, "id" | "when" | "targetVersionId">): AssignmentRule => ({
  name: over.id, active: true, priority: 10, ...over,
});
const input = (over: Partial<EvaluationInput> = {}, rules: AssignmentRule[] = []): EvaluationInput => ({
  completed: [], chapters, versions, rules, now: NOW, ...over,
});

describe("assignment evaluation", () => {
  it("1. a student with no completed chapters gets no chapter-based course", () => {
    const rules = [rule({ id: "r-9a", when: { chapter: "cbse-9-a" }, targetVersionId: "v1" })];
    const out = evaluateAssignment(input({ completed: [] }, rules));
    expect(out.outcome).toBe("unresolved");
  });

  it("2. one qualifying chapter is enough for a single-chapter rule", () => {
    const rules = [rule({ id: "r-9a", when: { chapter: "cbse-9-a" }, targetVersionId: "v1" })];
    const out = evaluateAssignment(input({ completed: ["cbse-9-a"] }, rules));
    expect(out).toMatchObject({ outcome: "assigned", versionId: "v1", ruleId: "r-9a" });
  });

  it("3. a rule requiring all its chapters needs every one of them", () => {
    const rules = [rule({ id: "r-all", when: { all: [{ chapter: "cbse-9-a" }, { chapter: "cbse-9-b" }] }, targetVersionId: "v1" })];
    expect(evaluateAssignment(input({ completed: ["cbse-9-a"] }, rules)).outcome).toBe("unresolved");
    expect(evaluateAssignment(input({ completed: ["cbse-9-a", "cbse-9-b"] }, rules))).toMatchObject({ outcome: "assigned", versionId: "v1" });
  });

  it("4. conditions can combine grades (a Grade 9 and a Grade 10 chapter)", () => {
    const rules = [rule({ id: "r-mix", when: { all: [{ chapter: "cbse-9-a" }, { chapter: "cbse-10-a" }] }, targetVersionId: "v2" })];
    expect(evaluateAssignment(input({ completed: ["cbse-9-a"] }, rules)).outcome).toBe("unresolved");
    expect(evaluateAssignment(input({ completed: ["cbse-9-a", "cbse-10-a"] }, rules))).toMatchObject({ outcome: "assigned", versionId: "v2" });
  });

  it("5. two rules matching the same student: higher priority wins, the other is reported as shadowed", () => {
    const rules = [
      rule({ id: "r-low", when: { chapter: "cbse-9-a" }, targetVersionId: "v1", priority: 1 }),
      rule({ id: "r-high", when: { chapter: "cbse-9-a" }, targetVersionId: "v2", priority: 5 }),
    ];
    const out = evaluateAssignment(input({ completed: ["cbse-9-a"] }, rules));
    expect(out).toMatchObject({ outcome: "assigned", ruleId: "r-high", versionId: "v2", matchedRuleIds: ["r-high", "r-low"], shadowedRuleIds: ["r-low"] });
  });

  it("5b. equal priority is resolved by the lower rule id, regardless of input order", () => {
    const a = rule({ id: "r-a", when: { chapter: "cbse-9-a" }, targetVersionId: "v1" });
    const b = rule({ id: "r-b", when: { chapter: "cbse-9-a" }, targetVersionId: "v2" });
    const forward = evaluateAssignment(input({ completed: ["cbse-9-a"] }, [a, b]));
    const backward = evaluateAssignment(input({ completed: ["cbse-9-a"] }, [b, a]));
    expect(forward).toEqual(backward);
    expect(forward).toMatchObject({ ruleId: "r-a" });
    expect(priorityTies([a, b])).toEqual([["r-a", "r-b"]]);
  });

  it("6. no active rule matching gives an explicit unresolved outcome, not an invented course", () => {
    const rules = [rule({ id: "r-9a", when: { chapter: "cbse-9-a" }, targetVersionId: "v1" })];
    const out = evaluateAssignment(input({ completed: ["cbse-11-a"] }, rules));
    expect(out.outcome).toBe("unresolved");
    expect(out).not.toHaveProperty("versionId");
  });

  it("6b. an explicitly configured fallback applies only when nothing matches", () => {
    const rules = [rule({ id: "r-9a", when: { chapter: "cbse-9-a" }, targetVersionId: "v1" })];
    expect(evaluateAssignment(input({ completed: [], fallbackVersionId: "fallback" }, rules)))
      .toMatchObject({ outcome: "fallback", versionId: "fallback" });
    expect(evaluateAssignment(input({ completed: ["cbse-9-a"], fallbackVersionId: "fallback" }, rules)))
      .toMatchObject({ outcome: "assigned", versionId: "v1" });
  });

  it("7. a rule targeting an unpublished course version never matches and is reported", () => {
    const rules = [rule({ id: "r-draft", when: { chapter: "cbse-9-a" }, targetVersionId: "v-draft" })];
    const out = evaluateAssignment(input({ completed: ["cbse-9-a"] }, rules));
    expect(out.outcome).toBe("unresolved");
    expect(out.issues).toContainEqual({ ruleId: "r-draft", issue: "inactive_version", versionId: "v-draft" });
  });

  it("8. a disabled rule is ignored without being reported as an error", () => {
    const rules = [rule({ id: "r-off", when: { chapter: "cbse-9-a" }, targetVersionId: "v1", active: false })];
    const out = evaluateAssignment(input({ completed: ["cbse-9-a"] }, rules));
    expect(out.outcome).toBe("unresolved");
    expect(out.issues).toEqual([]);
  });

  it("8b. rules outside their effective window do not apply", () => {
    const expired = rule({ id: "r-old", when: { chapter: "cbse-9-a" }, targetVersionId: "v1", effectiveUntil: "2026-01-01T00:00:00Z" });
    const future = rule({ id: "r-new", when: { chapter: "cbse-9-a" }, targetVersionId: "v2", effectiveFrom: "2027-01-01T00:00:00Z" });
    expect(evaluateAssignment(input({ completed: ["cbse-9-a"] }, [expired, future])).outcome).toBe("unresolved");
  });

  it("9. a rule referencing a chapter that is no longer active is invalid, not silently matched", () => {
    const rules = [rule({ id: "r-retired", when: { chapter: "cbse-10-retired" }, targetVersionId: "v1" })];
    const out = evaluateAssignment(input({ completed: ["cbse-10-retired"] }, rules));
    expect(out.outcome).toBe("unresolved");
    expect(out.issues).toContainEqual({ ruleId: "r-retired", issue: "inactive_chapter", chapterId: "cbse-10-retired" });
  });

  it("9b. a rule naming a chapter that does not exist is reported as unknown", () => {
    const issues = validateRule(rule({ id: "r-typo", when: { chapter: "cbse-9-zz" }, targetVersionId: "v1" }), { chapters, versions });
    expect(issues).toEqual([{ ruleId: "r-typo", issue: "unknown_chapter", chapterId: "cbse-9-zz" }]);
  });

  it("12. invalid rule structure is rejected before it can match", () => {
    expect(exprProblem({ all: [] })).toMatch(/at least one/);
    expect(exprProblem({ chapter: "" })).toMatch(/empty chapter id/);
    let deep: { all: unknown[] } | { chapter: string } = { chapter: "cbse-9-a" };
    for (let i = 0; i < 6; i++) deep = { all: [deep] };
    expect(exprProblem(deep as never)).toMatch(/deeper/);
    const bad = rule({ id: "r-bad", when: { all: [] } as never, targetVersionId: "v1" });
    expect(evaluateAssignment(input({ completed: ["cbse-9-a"] }, [bad])).issues[0]).toMatchObject({ issue: "invalid_expression" });
  });

  it("15. repeated evaluations give identical results", () => {
    const rules = [
      rule({ id: "r-a", when: { chapter: "cbse-9-a" }, targetVersionId: "v1", priority: 2 }),
      rule({ id: "r-b", when: { any: [{ chapter: "cbse-10-a" }, { chapter: "cbse-11-a" }] }, targetVersionId: "v2", priority: 2 }),
    ];
    const i = input({ completed: ["cbse-9-a", "cbse-11-a"] }, rules);
    const first = evaluateAssignment(i);
    for (let k = 0; k < 5; k++) expect(evaluateAssignment(i)).toEqual(first);
  });
});

import { canonicalExpr, findConflicts } from "./assignment";

describe("conflict detection", () => {
  it("treats the same condition written in another order as identical", () => {
    const a = { all: [{ chapter: "cbse-9-a" }, { chapter: "cbse-9-b" }] };
    const b = { all: [{ chapter: "cbse-9-b" }, { chapter: "cbse-9-a" }] };
    expect(canonicalExpr(a)).toBe(canonicalExpr(b));
  });

  it("flags two live rules with the same condition and different targets", () => {
    const rules = [
      rule({ id: "r1", when: { all: [{ chapter: "cbse-9-a" }, { chapter: "cbse-9-b" }] }, targetVersionId: "v1", priority: 1 }),
      rule({ id: "r2", when: { all: [{ chapter: "cbse-9-b" }, { chapter: "cbse-9-a" }] }, targetVersionId: "v2", priority: 2 }),
    ];
    expect(findConflicts(rules)).toContainEqual({ kind: "same_condition", ruleIds: ["r1", "r2"] });
  });

  it("does not flag the same condition when both rules send students to the same version", () => {
    const rules = [
      rule({ id: "r1", when: { chapter: "cbse-9-a" }, targetVersionId: "v1", priority: 1 }),
      rule({ id: "r2", when: { chapter: "cbse-9-a" }, targetVersionId: "v1", priority: 2 }),
    ];
    expect(findConflicts(rules).filter((c) => c.kind === "same_condition")).toEqual([]);
  });

  it("flags equal priorities among live rules, and ignores disabled ones", () => {
    const rules = [
      rule({ id: "r1", when: { chapter: "cbse-9-a" }, targetVersionId: "v1", priority: 5 }),
      rule({ id: "r2", when: { chapter: "cbse-10-a" }, targetVersionId: "v2", priority: 5 }),
      rule({ id: "r3", when: { chapter: "cbse-11-a" }, targetVersionId: "v2", priority: 5, active: false }),
    ];
    expect(findConflicts(rules)).toEqual([{ kind: "priority_tie", ruleIds: ["r1", "r2"] }]);
  });
});

describe("user groups", () => {
  const chapters: ChapterInfo[] = [{ id: "c1", grade: 11, active: true }, { id: "c2", grade: 11, active: true }];
  const versions: CourseVersionInfo[] = [{ id: "base", published: true }, { id: "pilot", published: true }, { id: "done", published: true }];
  const now = new Date("2026-10-14T00:00:00Z");
  const run = (rules: AssignmentRule[], completed: string[], groupIds: string[]) =>
    evaluateAssignment({ completed, groupIds, chapters, versions, rules, fallbackVersionId: "base", now });
  const rule = (over: Partial<AssignmentRule>): AssignmentRule => ({ id: "r", name: "R", active: true, priority: 0, targetVersionId: "pilot", when: null, ...over });

  it("a group-only rule (no chapter condition) applies to members and nobody else", () => {
    const rules = [rule({ audienceGroupId: "g1" })];
    expect(run(rules, [], ["g1"])).toMatchObject({ outcome: "assigned", versionId: "pilot" });
    expect(run(rules, [], ["g2"])).toMatchObject({ outcome: "fallback", versionId: "base" });
    expect(run(rules, ["c1"], [])).toMatchObject({ outcome: "fallback" });
  });

  it("a rule with a group and chapters needs both", () => {
    const rules = [rule({ audienceGroupId: "g1", when: { chapter: "c1" } })];
    expect(run(rules, ["c1"], ["g1"])).toMatchObject({ outcome: "assigned" });
    expect(run(rules, ["c1"], [])).toMatchObject({ outcome: "fallback" });
    expect(run(rules, [], ["g1"])).toMatchObject({ outcome: "fallback" });
  });

  it("a rule with neither a group nor a condition is invalid and never matches", () => {
    const r = run([rule({})], ["c1"], ["g1"]);
    expect(r.outcome).toBe("fallback");
    expect(r.issues).toEqual([expect.objectContaining({ issue: "invalid_expression" })]);
  });

  it("a group rule can outrank a general rule by priority", () => {
    const rules = [rule({ id: "a", targetVersionId: "done", when: { chapter: "c1" }, priority: 5 }), rule({ id: "b", audienceGroupId: "g1", priority: 9 })];
    expect(run(rules, ["c1"], ["g1"])).toMatchObject({ versionId: "pilot", ruleId: "b" });
    expect(run(rules, ["c1"], [])).toMatchObject({ versionId: "done", ruleId: "a" });
  });

  it("conflicts treat the same chapters for different groups as different conditions", () => {
    const a = rule({ id: "a", when: { chapter: "c1" }, audienceGroupId: "g1", targetVersionId: "pilot", priority: 1 });
    const b = rule({ id: "b", when: { chapter: "c1" }, audienceGroupId: "g2", targetVersionId: "done", priority: 2 });
    expect(findConflicts([a, b])).toEqual([]);
    expect(findConflicts([a, { ...b, audienceGroupId: "g1" }])).toEqual([{ kind: "same_condition", ruleIds: ["a", "b"] }]);
  });
});
