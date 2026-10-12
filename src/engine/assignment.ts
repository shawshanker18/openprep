// CBSE chapter-aware course assignment: a pure, deterministic evaluator. No database access here, so every
// rule is unit-tested on its own. Persistence, admin editing and the publish lifecycle live in the server layer.
//
// Policy, in one place:
//  1. Only rules that are active, inside their effective window, and valid (every chapter they name exists and is active,
//     and the target course version is published) can match. Invalid rules never match and are reported, never guessed around.
//  2. A rule matches when its condition is true for the student's completed chapters.
//  3. Several matches: the highest `priority` wins. Equal priority: the lower rule id wins. The result is always the same
//     for the same input, however the rules were listed.
//  4. Other matches are reported as shadowed, so an admin can see what a rule hides.
//  5. No match: the explicit fallback version if one is configured, otherwise "unresolved". Nothing is invented.

export type Expr =
  | { chapter: string }
  | { all: Expr[] }
  | { any: Expr[] };

export type AssignmentRule = {
  id: string;
  name: string;
  active: boolean;
  /** Higher wins when several rules match. */
  priority: number;
  targetVersionId: string;
  when: Expr;
  /** Inclusive start and exclusive end of the rule's effective window, as ISO dates or instants. Null = open-ended. */
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
};

export type ChapterInfo = { id: string; grade: 9 | 10 | 11 | 12; active: boolean };
export type CourseVersionInfo = { id: string; published: boolean };

export type RuleIssue =
  | { ruleId: string; issue: "invalid_expression"; detail: string }
  | { ruleId: string; issue: "unknown_chapter"; chapterId: string }
  | { ruleId: string; issue: "inactive_chapter"; chapterId: string }
  | { ruleId: string; issue: "unknown_version"; versionId: string }
  | { ruleId: string; issue: "inactive_version"; versionId: string };

export type EvaluationInput = {
  /** Chapter ids the student has completed. */
  completed: readonly string[];
  chapters: readonly ChapterInfo[];
  versions: readonly CourseVersionInfo[];
  rules: readonly AssignmentRule[];
  /** Explicit fallback course version, used only when no rule matches. */
  fallbackVersionId?: string | null;
  now: Date;
};

export type EvaluationResult =
  | {
      outcome: "assigned";
      versionId: string;
      ruleId: string;
      /** Every valid rule that matched, winner first. */
      matchedRuleIds: string[];
      /** Matched rules that lost to the winner (same version or not). Shown so admins can see what is hidden. */
      shadowedRuleIds: string[];
      reason: string;
      issues: RuleIssue[];
    }
  | { outcome: "fallback"; versionId: string; reason: string; issues: RuleIssue[] }
  | { outcome: "unresolved"; reason: string; issues: RuleIssue[] };

/** Limits so a malformed or hostile rule cannot cost unbounded work. Enforced again on save. */
export const MAX_EXPR_DEPTH = 5;
export const MAX_EXPR_NODES = 60;

export function exprChapters(expr: Expr): string[] {
  if ("chapter" in expr) return [expr.chapter];
  const kids = "all" in expr ? expr.all : expr.any;
  return kids.flatMap(exprChapters);
}

/** Structural check: non-empty groups, bounded depth and size. Returns a problem description, or null when fine. */
export function exprProblem(expr: Expr): string | null {
  let nodes = 0;
  const walk = (e: Expr, depth: number): string | null => {
    if (++nodes > MAX_EXPR_NODES) return `more than ${MAX_EXPR_NODES} conditions`;
    if (depth > MAX_EXPR_DEPTH) return `nested deeper than ${MAX_EXPR_DEPTH} levels`;
    if ("chapter" in e) return typeof e.chapter === "string" && e.chapter.length > 0 ? null : "empty chapter id";
    const kids = "all" in e ? e.all : e.any;
    if (!Array.isArray(kids) || kids.length === 0) return "a group must contain at least one condition";
    for (const k of kids) {
      const p = walk(k, depth + 1);
      if (p) return p;
    }
    return null;
  };
  return walk(expr, 1);
}

/** Whether an expression is true for the set of completed chapters. */
export function evaluateExpr(expr: Expr, completed: ReadonlySet<string>): boolean {
  if ("chapter" in expr) return completed.has(expr.chapter);
  if ("all" in expr) return expr.all.every((e) => evaluateExpr(e, completed));
  return expr.any.some((e) => evaluateExpr(e, completed));
}

const inWindow = (r: AssignmentRule, now: Date) => {
  const from = r.effectiveFrom ? Date.parse(r.effectiveFrom) : -Infinity;
  const until = r.effectiveUntil ? Date.parse(r.effectiveUntil) : Infinity;
  return now.getTime() >= from && now.getTime() < until;
};

/** Check one rule against the catalogue. Returns every problem found, so the admin sees them all at once. */
export function validateRule(rule: AssignmentRule, input: Pick<EvaluationInput, "chapters" | "versions">): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const problem = exprProblem(rule.when);
  if (problem) issues.push({ ruleId: rule.id, issue: "invalid_expression", detail: problem });
  else {
    const chapters = new Map(input.chapters.map((c) => [c.id, c]));
    for (const id of new Set(exprChapters(rule.when))) {
      const c = chapters.get(id);
      if (!c) issues.push({ ruleId: rule.id, issue: "unknown_chapter", chapterId: id });
      else if (!c.active) issues.push({ ruleId: rule.id, issue: "inactive_chapter", chapterId: id });
    }
  }
  const v = input.versions.find((x) => x.id === rule.targetVersionId);
  if (!v) issues.push({ ruleId: rule.id, issue: "unknown_version", versionId: rule.targetVersionId });
  else if (!v.published) issues.push({ ruleId: rule.id, issue: "inactive_version", versionId: rule.targetVersionId });
  return issues;
}

export function evaluateAssignment(input: EvaluationInput): EvaluationResult {
  const completed = new Set(input.completed);
  const issues: RuleIssue[] = [];
  const candidates: AssignmentRule[] = [];

  // Stable order before anything else, so the outcome never depends on how the caller listed the rules.
  const rules = [...input.rules].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const rule of rules) {
    if (!rule.active || !inWindow(rule, input.now)) continue;
    const found = validateRule(rule, input);
    issues.push(...found);
    if (found.length === 0 && evaluateExpr(rule.when, completed)) candidates.push(rule);
  }

  if (candidates.length === 0) {
    if (input.fallbackVersionId) {
      const fb = input.versions.find((v) => v.id === input.fallbackVersionId);
      if (fb?.published) return { outcome: "fallback", versionId: fb.id, reason: "No assignment rule matched, so the configured fallback course applies.", issues };
    }
    return { outcome: "unresolved", reason: "No active, valid assignment rule matched this student's completed chapters.", issues };
  }

  candidates.sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const [winner, ...rest] = candidates as [AssignmentRule, ...AssignmentRule[]];
  return {
    outcome: "assigned",
    versionId: winner.targetVersionId,
    ruleId: winner.id,
    matchedRuleIds: candidates.map((r) => r.id),
    shadowedRuleIds: rest.map((r) => r.id),
    reason: rest.length
      ? `Rule "${winner.name}" applies (priority ${winner.priority}). ${rest.length} other matching rule(s) were overridden.`
      : `Rule "${winner.name}" applies (priority ${winner.priority}).`,
    issues,
  };
}

/**
 * Find ties on priority among the matched rules, which an admin should resolve. Ties still resolve deterministically
 * (lower id wins), but the warning says the choice is arbitrary as far as the product is concerned.
 */
export function priorityTies(rules: readonly AssignmentRule[]): string[][] {
  const byPriority = new Map<number, string[]>();
  for (const r of rules) byPriority.set(r.priority, [...(byPriority.get(r.priority) ?? []), r.id]);
  return [...byPriority.values()].filter((ids) => ids.length > 1);
}

/** A condition's canonical text, so two rules written in a different order still compare as the same condition. */
export function canonicalExpr(expr: Expr): string {
  if ("chapter" in expr) return expr.chapter;
  const op = "all" in expr ? "all" : "any";
  const kids = ("all" in expr ? expr.all : expr.any).map(canonicalExpr).sort();
  return `${op}(${kids.join(",")})`;
}

/**
 * Problems an admin should see before a rule goes live. Shown beside the rule, never blocking a save of a draft.
 * - the same condition under two rules with different targets: a student can only get one of them, so one is hidden
 * - the same priority on rules that both match: resolved by rule id, which is arbitrary from the product's point of view
 */
export function findConflicts(rules: readonly AssignmentRule[]): { kind: "same_condition" | "priority_tie"; ruleIds: string[] }[] {
  const live = rules.filter((r) => r.active);
  const out: { kind: "same_condition" | "priority_tie"; ruleIds: string[] }[] = [];
  const byCondition = new Map<string, AssignmentRule[]>();
  for (const r of live) byCondition.set(canonicalExpr(r.when), [...(byCondition.get(canonicalExpr(r.when)) ?? []), r]);
  for (const group of byCondition.values()) {
    if (group.length > 1 && new Set(group.map((r) => r.targetVersionId)).size > 1) {
      out.push({ kind: "same_condition", ruleIds: group.map((r) => r.id).sort() });
    }
  }
  for (const ids of priorityTies(live)) out.push({ kind: "priority_tie", ruleIds: [...ids].sort() });
  return out;
}
