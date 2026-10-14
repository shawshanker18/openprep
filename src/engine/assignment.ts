
export type Expr =
  | { chapter: string }
  | { all: Expr[] }
  | { any: Expr[] };

export type AssignmentRule = {
  id: string;
  name: string;
  active: boolean;
  priority: number;
  targetVersionId: string;
  when: Expr | null;
  audienceGroupId?: string | null;
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
  completed: readonly string[];
  groupIds?: readonly string[];
  chapters: readonly ChapterInfo[];
  versions: readonly CourseVersionInfo[];
  rules: readonly AssignmentRule[];
  fallbackVersionId?: string | null;
  now: Date;
};

export type EvaluationResult =
  | {
      outcome: "assigned";
      versionId: string;
      ruleId: string;
      matchedRuleIds: string[];
      shadowedRuleIds: string[];
      reason: string;
      issues: RuleIssue[];
    }
  | { outcome: "fallback"; versionId: string; reason: string; issues: RuleIssue[] }
  | { outcome: "unresolved"; reason: string; issues: RuleIssue[] };

export const MAX_EXPR_DEPTH = 5;
export const MAX_EXPR_NODES = 60;

export function exprChapters(expr: Expr | null): string[] {
  if (!expr) return [];
  if ("chapter" in expr) return [expr.chapter];
  const kids = "all" in expr ? expr.all : expr.any;
  return kids.flatMap(exprChapters);
}

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

export function validateRule(rule: AssignmentRule, input: Pick<EvaluationInput, "chapters" | "versions">): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const problem = rule.when ? exprProblem(rule.when) : rule.audienceGroupId ? null : "a rule needs a chapter condition or a group";
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
  const groups = new Set(input.groupIds ?? []);
  const issues: RuleIssue[] = [];
  const candidates: AssignmentRule[] = [];

  const rules = [...input.rules].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const rule of rules) {
    if (!rule.active || !inWindow(rule, input.now)) continue;
    const found = validateRule(rule, input);
    issues.push(...found);
    const inAudience = !rule.audienceGroupId || groups.has(rule.audienceGroupId);
    if (found.length === 0 && inAudience && (!rule.when || evaluateExpr(rule.when, completed))) candidates.push(rule);
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

export function priorityTies(rules: readonly AssignmentRule[]): string[][] {
  const byPriority = new Map<number, string[]>();
  for (const r of rules) byPriority.set(r.priority, [...(byPriority.get(r.priority) ?? []), r.id]);
  return [...byPriority.values()].filter((ids) => ids.length > 1);
}

export function canonicalExpr(expr: Expr | null): string {
  if (!expr) return "(any)";
  if ("chapter" in expr) return expr.chapter;
  const op = "all" in expr ? "all" : "any";
  const kids = ("all" in expr ? expr.all : expr.any).map(canonicalExpr).sort();
  return `${op}(${kids.join(",")})`;
}

export function findConflicts(rules: readonly AssignmentRule[]): { kind: "same_condition" | "priority_tie"; ruleIds: string[] }[] {
  const live = rules.filter((r) => r.active);
  const out: { kind: "same_condition" | "priority_tie"; ruleIds: string[] }[] = [];
  const byCondition = new Map<string, AssignmentRule[]>();
  const key = (r: AssignmentRule) => `${r.audienceGroupId ?? "*"}|${canonicalExpr(r.when)}`;
  for (const r of live) byCondition.set(key(r), [...(byCondition.get(key(r)) ?? []), r]);
  for (const group of byCondition.values()) {
    if (group.length > 1 && new Set(group.map((r) => r.targetVersionId)).size > 1) {
      out.push({ kind: "same_condition", ruleIds: group.map((r) => r.id).sort() });
    }
  }
  for (const ids of priorityTies(live)) out.push({ kind: "priority_tie", ruleIds: [...ids].sort() });
  return out;
}
