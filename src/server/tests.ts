// Tests: assembly, module lifecycle, server-authoritative timing, scoring at completion (spec 03 §7–8, 04 §5).
// Mastery is only updated when the whole session completes; abandoned sessions change nothing.
import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { attempts, questions, scoreSnapshots, skillState, testItems, testModules, testSessions } from "@/db/schema";
import { SKILL_BY_ID } from "@/content/taxonomy";
import type { Difficulty } from "@/engine/constants";
import { assembleModule, largestRemainder, moduleBlueprint, routeFor, type Blueprint, type PoolQ } from "@/engine/assemble";
import { grade } from "@/engine/grade";
import { buildTestResult, type ResultItem } from "@/engine/score";
import { targetDifficulty } from "@/engine/select";
import { recordAttempt } from "./attempts";
import { toPublic, toRevealed } from "./questions";

export type TestKind = "full" | "section" | "module" | "mini" | "weakness" | "custom";
type Section = "rw" | "math";
type Config = { sections: Section[]; adaptive: boolean; timed: boolean; skillIds?: string[]; count?: number; tags?: string[]; difficulty?: Difficulty | "mixed"; title?: string };
const GRACE_MS = 10_000;

/**
 * Time to record for one answer. The browser's number pauses while the tab is hidden, so it is usually right, but
 * the server's own clock (time since the question was served) is the ceiling: a student can't claim more time than
 * really passed. Without a server timestamp, fall back to a 10 minute cap.
 */
export function serverCappedTime(clientMs: number, servedAt: Date | null, now: Date) {
  const serverMs = servedAt ? now.getTime() - servedAt.getTime() : 600_000;
  return Math.max(1000, Math.min(clientMs, Math.max(1000, serverMs)));
}

/** Active questions matching a filter, with when this user last saw each. */
async function pool(tx: Tx, userId: string, where: ReturnType<typeof and>) {
  const rows = await tx.select({ q: questions, seen: sql<Date | null>`max(${attempts.createdAt})` }).from(questions)
    .leftJoin(attempts, and(eq(attempts.questionId, questions.id), eq(attempts.userId, userId)))
    .where(and(eq(questions.status, "active"), where)).groupBy(questions.id);
  return rows.map((r) => ({ ...r.q, difficulty: r.q.difficulty as Difficulty, type: r.q.type as "mcq" | "spr", lastSeenAt: r.seen ? new Date(r.seen) : null }));
}

async function usedIds(tx: Tx, sessionId: string) {
  const rows = await tx.select({ id: testItems.questionId }).from(testItems)
    .innerJoin(testModules, eq(testModules.id, testItems.moduleId)).where(eq(testModules.sessionId, sessionId));
  return new Set(rows.map((r) => r.id));
}

async function insertModule(tx: Tx, sessionId: string, idx: number, section: string, route: string, timeLimitS: number | null, qs: PoolQ[]) {
  const [m] = await tx.insert(testModules).values({ sessionId, idx, section, route, timeLimitS }).returning();
  if (qs.length) await tx.insert(testItems).values(qs.map((q, position) => ({ moduleId: m!.id, position, questionId: q.id })));
  return m!;
}

/**
 * Module for a single skill set: count split across skills, difficulty mix given.
 * `tags` narrows each skill's pool to those sub-topics; a thin tagged pool is topped up from the rest of the skill.
 */
async function skillSetModule(tx: Tx, userId: string, sessionId: string, idx: number, skillIds: string[], count: number,
  mix: (skillId: string) => Record<Difficulty, number>, timeLimitS: number | null, tags: string[] = []) {
  const used = await usedIds(tx, sessionId);
  const split = largestRemainder(count, skillIds.map(() => 1));
  const picked: PoolQ[] = [];
  for (const [i, skillId] of skillIds.entries()) {
    const skill = SKILL_BY_ID[skillId]!;
    const bp: Blueprint = { section: skill.section, count: split[i]!, timeLimitS, domainCounts: { [skill.domain]: split[i]! }, difficultyCounts: mix(skillId) };
    const all = await pool(tx, userId, eq(questions.skillId, skillId));
    const tagged = tags.length ? all.filter((q) => q.tags.some((t) => tags.includes(t))) : all;
    const got = assembleModule(bp, tagged, new Set([...used, ...picked.map((p) => p.id)]), Math.random);
    const short = bp.count - got.length;
    if (short > 0 && tagged !== all)
      got.push(...assembleModule({ ...bp, count: short, domainCounts: { [skill.domain]: short } }, all, new Set([...used, ...picked.map((p) => p.id), ...got.map((g) => g.id)]), Math.random));
    picked.push(...got);
  }
  const sections = new Set(skillIds.map((s) => SKILL_BY_ID[s]!.section));
  return insertModule(tx, sessionId, idx, sections.size === 1 ? [...sections][0]! : "mixed", "base", timeLimitS, picked);
}

// Every new test hands out questions, so starting them has a speed limit (anti-scraping). It's not a quota: no one
// starts tests this fast by hand, even ending each one straight away.
const START_LIMIT = { ms: 5 * 60_000, max: 4 };

export async function startTest(userId: string, input: {
  kind: TestKind; section?: Section; skillId?: string; skillIds?: string[]; count?: number; timed?: boolean; focus?: string[];
  tags?: string[]; difficulty?: Difficulty | "mixed"; title?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string; resumeId?: string }> {
  const [{ n }] = (await db.select({ n: count() }).from(testSessions)
    .where(and(eq(testSessions.userId, userId), gte(testSessions.startedAt, new Date(Date.now() - START_LIMIT.ms))))) as [{ n: number }];
  if (n >= START_LIMIT.max) return { ok: false, error: "rate" };
  if (input.kind === "full" || input.kind === "section") {
    const [open] = await db.select({ id: testSessions.id }).from(testSessions)
      .where(and(eq(testSessions.userId, userId), eq(testSessions.status, "in_progress"), inArray(testSessions.kind, ["full", "section"]))).limit(1);
    if (open) return { ok: false, error: "You already have a test in progress.", resumeId: open.id };
  }
  const timed = input.timed ?? (input.kind !== "weakness");
  return db.transaction(async (tx) => {
    const sections: Section[] = input.kind === "full" ? ["rw", "math"] : input.section ? [input.section] : [];
    const config: Config = { sections, adaptive: input.kind === "full" || input.kind === "section", timed };
    if (input.kind === "custom") Object.assign(config, { skillIds: input.skillIds, count: input.count, tags: input.tags ?? [], difficulty: input.difficulty ?? "mixed", ...(input.title ? { title: input.title } : {}) });
    const [s] = await tx.insert(testSessions).values({ userId, kind: input.kind, config }).returning({ id: testSessions.id });
    const id = s!.id;

    if (input.kind === "full" || input.kind === "section" || input.kind === "module") {
      const sec = sections[0] ?? "rw";
      const bp = moduleBlueprint(sec, "base", timed);
      await insertModule(tx, id, 0, sec, "base", bp.timeLimitS, assembleModule(bp, await pool(tx, userId, eq(questions.section, sec)), new Set(), Math.random));
    } else if (input.kind === "mini") {
      const skill = SKILL_BY_ID[input.skillId ?? ""];
      if (!skill) throw new Error("mini test needs a skill");
      await skillSetModule(tx, userId, id, 0, [skill.id], 10, () => ({ 1: 3, 2: 4, 3: 3 }), timed ? (skill.section === "rw" ? 12 : 15) * 60 : null);
    } else if (input.kind === "weakness") {
      const focus = (input.focus ?? []).filter((f) => SKILL_BY_ID[f]);
      const states = await tx.select().from(skillState).where(eq(skillState.userId, userId));
      await skillSetModule(tx, userId, id, 0, focus, 5 * focus.length, (sk) => {
        const d = targetDifficulty(states.find((x) => x.skillId === sk)?.theta ?? 0, Math.random);
        return { 1: d === 1 ? 1 : 0, 2: d === 2 ? 1 : 0, 3: d === 3 ? 1 : 0 };
      }, null);
    } else {
      const skills = (input.skillIds ?? []).filter((x) => SKILL_BY_ID[x]);
      const count = Math.min(30, Math.max(5, input.count ?? 10));
      const secs = skills.map((x) => SKILL_BY_ID[x]!.section);
      const limit = timed ? Math.round((count * secs.reduce((a, s) => a + (s === "rw" ? 71 : 95), 0)) / secs.length) : null;
      const d = input.difficulty;
      // A single difficulty borrows the adjacent ones when the bank is thin (assembleModule never throws).
      const mix = d && d !== "mixed" ? { 1: d === 1 ? 1 : 0, 2: d === 2 ? 1 : 0, 3: d === 3 ? 1 : 0 } : { 1: 1, 2: 1, 3: 1 };
      await skillSetModule(tx, userId, id, 0, skills, count, () => mix, limit, input.tags ?? []);
    }
    const [{ n }] = (await tx.select({ n: sql<number>`count(*)::int` }).from(testItems)
      .innerJoin(testModules, eq(testModules.id, testItems.moduleId)).where(eq(testModules.sessionId, id))) as [{ n: number }];
    if (n === 0) throw new NoQuestions();
    return { ok: true as const, id };
  }).catch((e) => {
    if (e instanceof NoQuestions) return { ok: false as const, error: "There aren't any questions for this test yet." };
    throw e;
  });
}
class NoQuestions extends Error {}

async function loadSession(tx: Tx, userId: string, sessionId: string, lock = false) {
  const q = tx.select().from(testSessions).where(and(eq(testSessions.id, sessionId), eq(testSessions.userId, userId)));
  const [s] = lock ? await q.for("update") : await q;
  return s ?? null;
}

async function moduleItems(tx: Tx, moduleId: string) {
  return tx.select({ item: testItems, q: questions }).from(testItems)
    .innerJoin(questions, eq(questions.id, testItems.questionId))
    .where(eq(testItems.moduleId, moduleId)).orderBy(asc(testItems.position));
}

/** Submits a module (idempotent), adds the next module if any, finishes the session after the last one. */
async function submitModuleTx(tx: Tx, userId: string, sessionId: string, moduleId: string, now: Date) {
  const s = await loadSession(tx, userId, sessionId, true);
  if (!s || s.status !== "in_progress") return;
  const [m] = await tx.update(testModules).set({ submittedAt: now })
    .where(and(eq(testModules.id, moduleId), eq(testModules.sessionId, sessionId), isNull(testModules.submittedAt))).returning();
  if (!m) return; // already submitted: double-submit and timer/submit races are no-ops

  const cfg = s.config as Config;
  const section = m.section as Section;
  // Candidate next modules in order: routed module 2 of this section, then module 1 of the next section.
  // A candidate with no questions left (thin bank) is skipped rather than ending the whole test.
  const next: { section: Section; route: "base" | "hard" | "easy" }[] = [];
  if (cfg.adaptive && m.route === "base") {
    const its = await moduleItems(tx, m.id);
    const correct = its.filter((i) => i.item.response !== null && grade(i.q, i.item.response)).length;
    next.push({ section, route: routeFor(section, correct, its.length) });
  }
  const si = cfg.sections.indexOf(section);
  if (cfg.adaptive && si >= 0 && si + 1 < cfg.sections.length) next.push({ section: cfg.sections[si + 1]!, route: "base" });
  for (const n of next) {
    const bp = moduleBlueprint(n.section, n.route, cfg.timed);
    const qs = assembleModule(bp, await pool(tx, userId, eq(questions.section, n.section)), await usedIds(tx, sessionId), Math.random);
    if (qs.length) { await insertModule(tx, sessionId, m.idx + 1, n.section, n.route, bp.timeLimitS, qs); return; }
  }
  await finishSession(tx, userId, s, now);
}

async function finishSession(tx: Tx, userId: string, s: typeof testSessions.$inferSelect, now: Date) {
  const mods = await tx.select().from(testModules).where(eq(testModules.sessionId, s.id)).orderBy(asc(testModules.idx));
  const items: ResultItem[] = [];
  for (const m of mods) {
    for (const { item, q } of await moduleItems(tx, m.id)) {
      const r = await recordAttempt(tx, userId, q, {
        response: item.response, timeMs: item.timeMs, confidence: null, context: "test", sessionId: s.id, now,
      });
      items.push({ section: q.section as Section, domain: q.domain, skillId: q.skillId, difficulty: q.difficulty as Difficulty,
        correct: r.correct, answered: item.response !== null, timeMs: item.timeMs, mistakeType: r.mistakeType });
    }
  }
  const cfg = s.config as Config;
  const meta: Partial<Record<Section, { route: string; scored: boolean }>> = {};
  for (const sec of ["rw", "math"] as const) {
    const ms = mods.filter((m) => m.section === sec);
    if (ms.length) meta[sec] = { route: ms.at(-1)!.route, scored: cfg.adaptive && ms.length === 2 };
  }
  const result = buildTestResult(items, meta);
  await tx.update(testSessions).set({ status: "completed", completedAt: now, result }).where(eq(testSessions.id, s.id));
  if (s.kind === "full" && result.sections.rw?.score != null && result.sections.math?.score != null)
    await tx.insert(scoreSnapshots).values({ userId, source: "mock", rw: result.sections.rw.score, math: result.sections.math.score, halfWidth: result.halfWidth, takenAt: now });
}

/** Current state for the runner page. Auto-submits a module whose deadline has passed (tab was closed). */
export async function getTestState(userId: string, sessionId: string) {
  for (let i = 0; i < 6; i++) {
    const now = new Date();
    const state = await db.transaction(async (tx) => {
      const s = await loadSession(tx, userId, sessionId);
      if (!s) return { kind: "missing" as const };
      if (s.status !== "in_progress") return { kind: "finished" as const, status: s.status };
      const mods = await tx.select().from(testModules).where(eq(testModules.sessionId, s.id)).orderBy(asc(testModules.idx));
      const cur = mods.find((m) => !m.submittedAt);
      if (!cur) { await finishSession(tx, userId, s, now); return { kind: "finished" as const, status: "completed" }; }
      if (cur.deadlineAt && now.getTime() > cur.deadlineAt.getTime() + GRACE_MS) {
        await submitModuleTx(tx, userId, s.id, cur.id, now);
        return { kind: "retry" as const };
      }
      const prev = mods[mods.indexOf(cur) - 1];
      const items = await moduleItems(tx, cur.id);
      return {
        kind: "module" as const, session: { id: s.id, kind: s.kind, title: (s.config as Config).title ?? null },
        module: { id: cur.id, idx: cur.idx, section: cur.section, route: cur.route, timeLimitS: cur.timeLimitS,
          startedAt: cur.startedAt?.toISOString() ?? null, deadlineAt: cur.deadlineAt?.toISOString() ?? null, adaptive: (s.config as Config).adaptive },
        breakBefore: s.kind === "full" && !cur.startedAt && prev?.section === "rw" && cur.section === "math",
        items: items.map(({ item, q }) => ({ position: item.position, question: toPublic(q), response: item.response, flagged: item.flagged })),
        serverNow: now.toISOString(),
      };
    });
    if (state.kind !== "retry") return state;
  }
  throw new Error("test state did not settle");
}

async function ownedModule(tx: Tx, userId: string, moduleId: string) {
  const [r] = await tx.select({ m: testModules, s: testSessions }).from(testModules)
    .innerJoin(testSessions, eq(testSessions.id, testModules.sessionId))
    .where(and(eq(testModules.id, moduleId), eq(testSessions.userId, userId)));
  return r ?? null;
}

export async function startModule(userId: string, moduleId: string) {
  return db.transaction(async (tx) => {
    const r = await ownedModule(tx, userId, moduleId);
    if (!r || r.s.status !== "in_progress" || r.m.submittedAt) return false;
    if (r.m.startedAt) return true; // idempotent
    const now = new Date();
    await tx.update(testModules).set({
      startedAt: now, deadlineAt: r.m.timeLimitS ? new Date(now.getTime() + r.m.timeLimitS * 1000) : null,
    }).where(and(eq(testModules.id, moduleId), isNull(testModules.startedAt)));
    return true;
  });
}

export async function saveResponse(userId: string, input: {
  moduleId: string; position: number; response: string | null; flagged: boolean; timeMsDelta: number;
}) {
  return db.transaction(async (tx) => {
    const r = await ownedModule(tx, userId, input.moduleId);
    if (!r || r.s.status !== "in_progress" || r.m.submittedAt || !r.m.startedAt) return { ok: false as const, error: "This module is closed." };
    if (r.m.deadlineAt && Date.now() > r.m.deadlineAt.getTime() + GRACE_MS) return { ok: false as const, error: "Time is up for this module." };
    // Server clock: across the module, recorded time can't exceed the real time since the module started.
    const [{ used }] = (await tx.select({ used: sql<number>`coalesce(sum(${testItems.timeMs}), 0)::int` }).from(testItems)
      .where(eq(testItems.moduleId, input.moduleId))) as [{ used: number }];
    const room = Math.max(0, Date.now() - r.m.startedAt.getTime() + 2000 - used);
    const delta = Math.max(0, Math.min(input.timeMsDelta, 3_600_000, room));
    const [u] = await tx.update(testItems).set({
      response: input.response, flagged: input.flagged,
      timeMs: sql`least(${testItems.timeMs} + ${delta}, 3600000)`,
    }).where(and(eq(testItems.moduleId, input.moduleId), eq(testItems.position, input.position))).returning();
    return u ? { ok: true as const, data: undefined } : { ok: false as const, error: "Unknown question." };
  });
}

export async function submitModule(userId: string, moduleId: string) {
  return db.transaction(async (tx) => {
    const r = await ownedModule(tx, userId, moduleId);
    if (!r) return false;
    await submitModuleTx(tx, userId, r.s.id, moduleId, new Date());
    const [after] = await tx.select({ status: testSessions.status }).from(testSessions).where(eq(testSessions.id, r.s.id));
    return { finished: after?.status !== "in_progress" }; // the runner goes straight to results when the test is over
  });
}

export async function abandonTest(userId: string, sessionId: string) {
  await db.update(testSessions).set({ status: "abandoned", completedAt: new Date() })
    .where(and(eq(testSessions.id, sessionId), eq(testSessions.userId, userId), eq(testSessions.status, "in_progress")));
}

/** Completed session with every question revealed (answers are only shown after the whole test). */
export async function getTestResult(userId: string, sessionId: string) {
  const [s] = await db.select().from(testSessions).where(and(eq(testSessions.id, sessionId), eq(testSessions.userId, userId)));
  if (!s || s.status !== "completed") return s ? { session: s, items: [] } : null;
  const rows = await db.select({ item: testItems, q: questions, m: testModules }).from(testItems)
    .innerJoin(testModules, eq(testModules.id, testItems.moduleId)).innerJoin(questions, eq(questions.id, testItems.questionId))
    .where(eq(testModules.sessionId, s.id)).orderBy(asc(testModules.idx), asc(testItems.position));
  const att = await db.select({ id: attempts.id, questionId: attempts.questionId, correct: attempts.correct, mistakeType: attempts.mistakeType })
    .from(attempts).where(and(eq(attempts.userId, userId), eq(attempts.sessionId, s.id)));
  return {
    session: s,
    items: rows.map(({ item, q, m }) => {
      const a = att.find((x) => x.questionId === q.id);
      return { moduleIdx: m.idx, section: m.section, position: item.position, response: item.response, timeMs: item.timeMs,
        correct: a?.correct ?? false, attemptId: a?.id ?? null, mistakeType: a?.mistakeType ?? null, question: toRevealed(q) };
    }),
  };
}

export const TESTS_PER_PAGE = 20;
/** One page of the student's tests, newest first (one extra row says whether there's another page). */
export async function listTests(userId: string, page = 1) {
  return db.select().from(testSessions).where(eq(testSessions.userId, userId)).orderBy(desc(testSessions.startedAt))
    .limit(TESTS_PER_PAGE + 1).offset((page - 1) * TESTS_PER_PAGE);
}

/** Every unfinished test (not just the recent page), so none drops out of "in progress". */
export async function openTests(userId: string) {
  return db.select().from(testSessions).where(and(eq(testSessions.userId, userId), eq(testSessions.status, "in_progress")))
    .orderBy(desc(testSessions.startedAt));
}

/** Questions in this student's unfinished tests (practice mustn't serve them). */
export async function runningTestQuestionIds(userId: string) {
  const rows = await db.selectDistinct({ id: testItems.questionId }).from(testItems)
    .innerJoin(testModules, eq(testModules.id, testItems.moduleId))
    .innerJoin(testSessions, eq(testSessions.id, testModules.sessionId))
    .where(and(eq(testSessions.userId, userId), eq(testSessions.status, "in_progress")));
  return rows.map((r) => r.id);
}

/** Is any of this question's test sessions still running for this user? (No AI help during tests.) */
export async function inRunningTest(userId: string, questionId: string) {
  const [r] = await db.select({ id: testSessions.id }).from(testItems)
    .innerJoin(testModules, eq(testModules.id, testItems.moduleId))
    .innerJoin(testSessions, eq(testSessions.id, testModules.sessionId))
    .where(and(eq(testItems.questionId, questionId), eq(testSessions.userId, userId), eq(testSessions.status, "in_progress"))).limit(1);
  return !!r;
}

/**
 * The test is running in an app's lockdown. The first app install to lock it is the only one that can carry it on
 * (keyHash: see server/lockdown.ts); a later call can't rebind it to another install.
 */
export async function markLocked(userId: string, sessionId: string, keyHash: string | null) {
  const key = keyHash ? sql`coalesce(${testSessions.config}->'lockKey', to_jsonb(${keyHash}::text))` : sql`${testSessions.config}->'lockKey'`;
  await db.update(testSessions)
    .set({ config: sql`jsonb_strip_nulls(jsonb_set(jsonb_set(${testSessions.config}, '{lockdown}', 'true'), '{lockKey}', coalesce(${key}, 'null'::jsonb)))` })
    .where(and(eq(testSessions.id, sessionId), eq(testSessions.userId, userId), eq(testSessions.status, "in_progress")));
}

export async function recordFocusLoss(userId: string, sessionId: string) {
  await db.update(testSessions)
    .set({ config: sql`jsonb_set(${testSessions.config}, '{focusLost}', to_jsonb(coalesce((${testSessions.config}->>'focusLost')::int, 0) + 1))` })
    .where(and(eq(testSessions.id, sessionId), eq(testSessions.userId, userId), eq(testSessions.status, "in_progress")));
}

/**
 * Server-side test timer, run every few minutes by the cron tick: submits modules whose time ran out (the student
 * closed the tab or lost connection) and abandons non-diagnostic tests nobody has touched for 3 days.
 */
export async function sweepTests(now = new Date()) {
  const expired = await db.select({ moduleId: testModules.id, sessionId: testSessions.id, userId: testSessions.userId })
    .from(testModules).innerJoin(testSessions, eq(testSessions.id, testModules.sessionId))
    .where(and(eq(testSessions.status, "in_progress"), isNull(testModules.submittedAt),
      lt(testModules.deadlineAt, new Date(now.getTime() - GRACE_MS))))
    .limit(200);
  for (const e of expired) await db.transaction((tx) => submitModuleTx(tx, e.userId, e.sessionId, e.moduleId, now));
  const stale = await db.update(testSessions).set({ status: "abandoned", completedAt: now })
    .where(and(eq(testSessions.status, "in_progress"), sql`${testSessions.kind} <> 'diagnostic'`,
      lt(testSessions.startedAt, new Date(now.getTime() - 3 * 86_400_000))))
    .returning({ id: testSessions.id });
  return { submitted: expired.length, abandoned: stale.length };
}

/**
 * Plan 02 §7: a full mock should be at least 80% questions this student hasn't answered yet. False when the bank
 * is too thin for that (the Tests page then says so, but still lets them start).
 */
export async function freshFullMock(userId: string) {
  const rows = await db.select({
    section: questions.section,
    unseen: sql<number>`count(*) filter (where not exists (select 1 from attempts a where a.user_id = ${userId} and a.question_id = "questions"."id"))::int`,
  }).from(questions).where(eq(questions.status, "active")).groupBy(questions.section);
  return (["rw", "math"] as const).every((s) => (rows.find((r) => r.section === s)?.unseen ?? 0) >= 0.8 * 2 * moduleBlueprint(s, "base").count);
}
