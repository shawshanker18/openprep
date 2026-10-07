// Adaptive diagnostic on top of the test-session tables (spec 03 §4, 04 §5.2 item 5).
// Items are appended one at a time; every answer goes through recordAttempt immediately.
import "server-only";
import { serverCappedTime } from "./tests";
import { and, asc, count, eq } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { attempts, profiles, questions, scoreSnapshots, skillState, testItems, testModules, testSessions, type Question } from "@/db/schema";
import { DOMAINS, skillsIn } from "@/content/taxonomy";
import type { Difficulty } from "@/engine/constants";
import { nextDiagnosticSpec, type DiagAnswered, type DiagSpec } from "@/engine/diagnostic";
import { sectionEstimate, totalEstimate } from "@/engine/score";
import { recordAttempt } from "./attempts";
import { exposeQuestions } from "./delivery";
import { deliveryContext } from "./delivery-context";
import { questionExposures } from "@/db/schema";
import { toPublic } from "./questions";

const SKILLS_BY_DOMAIN = Object.fromEntries(Object.keys(DOMAINS).map((d) => [d, skillsIn(d).map((s) => s.id)]));

async function sessionItems(tx: Tx, sessionId: string) {
  return tx.select({ moduleId: testItems.moduleId, position: testItems.position, servedAt: testItems.servedAt, q: questions })
    .from(testItems)
    .innerJoin(testModules, eq(testItems.moduleId, testModules.id))
    .innerJoin(questions, eq(questions.id, testItems.questionId))
    .where(eq(testModules.sessionId, sessionId))
    .orderBy(asc(testModules.idx), asc(testItems.position));
}

async function answeredCount(tx: Tx, userId: string, sessionId: string) {
  const [r] = await tx.select({ c: count() }).from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.sessionId, sessionId)));
  return r!.c;
}

/** Best question for a spec: same skill+difficulty, else same skill nearest difficulty, else anywhere in the domain. */
async function pickFor(tx: Tx, spec: DiagSpec, used: Set<string>): Promise<Question | null> {
  const pool = (await tx.select().from(questions)
    .where(and(eq(questions.domain, spec.domain), eq(questions.status, "active"))))
    .filter((q) => !used.has(q.id));
  if (!pool.length) return null;
  const score = (q: Question) =>
    (q.skillId === spec.skillId ? 0 : 10) + Math.abs(q.difficulty - spec.difficulty) + Math.random() * 0.5;
  return pool.reduce((best, q) => (score(q) < score(best) ? q : best));
}

/** Appends the next item; returns its question, or null when the diagnostic is over. */
async function appendNext(tx: Tx, userId: string, sessionId: string): Promise<Question | null> {
  const items = await sessionItems(tx, sessionId);
  const used = new Set(items.map((i) => i.q.id));
  const done = await tx.select({ questionId: attempts.questionId, correct: attempts.correct }).from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.sessionId, sessionId)));
  const byId = new Map(items.map((i) => [i.q.id, i.q]));
  const answered: DiagAnswered[] = done.map((a) => {
    const q = byId.get(a.questionId)!;
    return { domain: q.domain, skillId: q.skillId, difficulty: q.difficulty as Difficulty, correct: a.correct };
  });

  const states = await tx.select().from(skillState).where(eq(skillState.userId, userId));
  const prior: Record<string, number> = {};
  for (const d of Object.keys(DOMAINS)) {
    const ts = states.filter((s) => SKILLS_BY_DOMAIN[d]!.includes(s.skillId)).map((s) => s.theta);
    prior[d] = ts.length ? ts.reduce((a, b) => a + b, 0) / ts.length : 0;
  }

  const skip = new Set<string>();
  for (;;) {
    const spec = nextDiagnosticSpec(answered, prior, SKILLS_BY_DOMAIN, skip);
    if (!spec) return null;
    const q = await pickFor(tx, spec, used);
    if (!q) { skip.add(spec.domain); continue; } // thin bank: no questions left in this domain
    const [mod] = await tx.select().from(testModules)
      .where(and(eq(testModules.sessionId, sessionId), eq(testModules.section, q.section)));
    const position = items.filter((i) => i.moduleId === mod!.id).length;
    await tx.insert(testItems).values({ moduleId: mod!.id, position, questionId: q.id, servedAt: new Date() });
    return q;
  }
}

async function finish(tx: Tx, userId: string, sessionId: string, now: Date) {
  const states = await tx.select().from(skillState).where(eq(skillState.userId, userId));
  const rw = sectionEstimate(states, "rw"), math = sectionEstimate(states, "math");
  const total = totalEstimate(rw, math);
  await tx.update(testSessions).set({ status: "completed", completedAt: now, result: { rw, math, total } })
    .where(eq(testSessions.id, sessionId));
  await tx.insert(scoreSnapshots).values({ userId, source: "diagnostic", rw: rw.score, math: math.score, halfWidth: total.half, takenAt: now });
  await tx.update(profiles).set({ onboardingStep: "done" }).where(eq(profiles.id, userId));
}

export async function startDiagnostic(userId: string): Promise<string> {
  const [existing] = await db.select({ id: testSessions.id }).from(testSessions)
    .where(and(eq(testSessions.userId, userId), eq(testSessions.kind, "diagnostic"), eq(testSessions.status, "in_progress")))
    .limit(1);
  if (existing) return existing.id;
  return db.transaction(async (tx) => {
    const now = new Date();
    const [s] = await tx.insert(testSessions).values({ userId, kind: "diagnostic" }).returning({ id: testSessions.id });
    await tx.insert(testModules).values([
      { sessionId: s!.id, idx: 0, section: "rw", startedAt: now },
      { sessionId: s!.id, idx: 1, section: "math", startedAt: now },
    ]);
    if (!(await appendNext(tx, userId, s!.id))) await finish(tx, userId, s!.id, now); // empty bank
    return s!.id;
  });
}

export async function getDiagnostic(userId: string, sessionId: string) {
  const context=await deliveryContext();
  const [s] = await db.select().from(testSessions)
    .where(and(eq(testSessions.id, sessionId), eq(testSessions.userId, userId), eq(testSessions.kind, "diagnostic")));
  if (!s) return null;
  if (s.status !== "in_progress") return { status: s.status, current: null, index: 0 };
  return db.transaction(async (tx) => {
    const items = await sessionItems(tx, sessionId);
    const index = await answeredCount(tx, userId, sessionId);
    const cur = items[index];
    if(cur) await exposeQuestions(tx,userId,[cur.q],context);
    return { status: s.status, current: cur ? toPublic(cur.q, userId) : null, index };
  });
}

export async function answerDiagnostic(userId: string, input: {
  sessionId: string; questionId: string; response: string | null; timeMs: number; confidence?: 1 | 2 | 3 | null;
}) {
  const context=await deliveryContext();
  return db.transaction(async (tx) => {
    const now = new Date();
    const [s] = await tx.select().from(testSessions)
      .where(and(eq(testSessions.id, input.sessionId), eq(testSessions.userId, userId), eq(testSessions.kind, "diagnostic")))
      .for("update");
    if (!s || s.status !== "in_progress") return { ok: false as const, error: "This diagnostic is no longer active." };
    const items = await sessionItems(tx, input.sessionId);
    const index = await answeredCount(tx, userId, input.sessionId);
    const cur = items[index];
    if (!cur || cur.q.id !== input.questionId) return { ok: false as const, error: "That question was already answered. Reload to continue." };
    const [exposure]=await tx.select().from(questionExposures).where(and(eq(questionExposures.userId,userId),eq(questionExposures.questionId,cur.q.id)));
    if(!exposure) return {ok:false as const,error:"Reload this question and try again."};
    const timeMs = serverCappedTime(input.timeMs, cur.servedAt, now);

    await tx.update(testItems).set({ response: input.response, timeMs })
      .where(and(eq(testItems.moduleId, cur.moduleId), eq(testItems.position, cur.position)));
    await recordAttempt(tx, userId, cur.q, {
      response: input.response, timeMs, confidence: input.response === null ? 1 : (input.confidence ?? null),
      context: "diagnostic", sessionId: input.sessionId, now,
    });
    const next = await appendNext(tx, userId, input.sessionId);
    if (!next) {
      await finish(tx, userId, input.sessionId, now);
      return { ok: true as const, data: { done: true as const } };
    }
    await exposeQuestions(tx,userId,[next],context);
    return { ok: true as const, data: { done: false as const, question: toPublic(next, userId), index: index + 1 } };
  });
}
