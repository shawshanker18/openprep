// Practice: which question next, and submitting an answer (spec 04 §3).
import "server-only";
import { availableQuestion } from "./question-availability";
import { memo } from "@/lib/memo";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lte, notInArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { attempts, bookmarks, questionExposures, questionServes, questions, reviewItems, skillState, type Profile, type Question } from "@/db/schema";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { TARGET_SECONDS, type Difficulty } from "@/engine/constants";
import { masteryPct, pace, status } from "@/engine/mastery";
import { pickQuestion, targetDifficulty } from "@/engine/select";
import { recordAttempt } from "./attempts";
import { ensureWeeklyFocus, skillsByPriority } from "./plan";
import { toPublic, toRevealed } from "./questions";
import { servePractice } from "./delivery";
import { deliveryContext, type DeliveryContext } from "./delivery-context";
import { DELIVERY_POLICY, DeliveryBlocked } from "./delivery-policy";
import { inRunningTest, runningTestQuestionIds, serverCappedTime } from "./tests";

export type PracticeMode = "skill" | "smart" | "review" | "set" | "list";
export type SetDifficulty = Difficulty | "mixed"; // undefined = auto (targetDifficulty from theta)
export type Timing = "auto" | "off" | "on";

async function dueReview(userId: string, now: Date, exclude: string[], skillId?: string) {
  const rows = await db.select({ q: questions }).from(reviewItems)
    .innerJoin(questions, eq(questions.id, reviewItems.questionId))
    .where(and(eq(reviewItems.userId, userId), lte(reviewItems.dueAt, now), availableQuestion(userId), skillId ? eq(questions.skillId, skillId) : undefined))
    .orderBy(asc(reviewItems.dueAt)).limit(exclude.length + 1);
  return rows.map((r) => r.q).find((q) => !exclude.includes(q.id)) ?? null;
}

export async function countDueReviews(userId: string, now = new Date()) {
  const [r] = await db.select({ c: count() }).from(reviewItems)
    .where(and(eq(reviewItems.userId, userId), lte(reviewItems.dueAt, now)));
  return r!.c;
}

/** Pick a question in one skill: similar-question after a miss, else adaptive difficulty. `tags` (if any) is a strict filter. */
async function pickInSkill(userId: string, skillId: string, exclude: string[], now: Date, forced?: Difficulty, tags: string[] = [], exploratory = false): Promise<Question | null> {
  // Only the fields selection needs; the full text is fetched for the one question picked.
  const slim = { id: questions.id, difficulty: questions.difficulty, tags: questions.tags };
  const [pool, seen, queued, [state], [last]] = await Promise.all([
    db.select(slim).from(questions).where(and(eq(questions.skillId, skillId), eq(questions.status, "active"), availableQuestion(userId), exclude.length ? notInArray(questions.id, exclude) : undefined, forced ? eq(questions.difficulty, forced) : undefined)),
    db.select({ id: attempts.questionId, at: sql<Date>`max(${attempts.createdAt})` }).from(attempts)
      .where(and(eq(attempts.userId, userId), eq(attempts.skillId, skillId))).groupBy(attempts.questionId),
    db.select({ id: reviewItems.questionId }).from(reviewItems).where(eq(reviewItems.userId, userId)),
    db.select().from(skillState).where(and(eq(skillState.userId, userId), eq(skillState.skillId, skillId))),
    db.select({ q: slim, correct: attempts.correct }).from(attempts)
      .innerJoin(questions, eq(questions.id, attempts.questionId))
      .where(and(eq(attempts.userId, userId), eq(attempts.skillId, skillId)))
      .orderBy(desc(attempts.createdAt)).limit(1),
  ]);
  const lastSeen = new Map(seen.map((s) => [s.id, new Date(s.at)]));
  const blocked = new Set([...exclude, ...queued.map((r) => r.id)]);
  // Review-queue questions are held back for review — unless that would leave nothing to practice (thin bank).
  const tagged = tags.length ? pool.filter((q) => q.tags.some((t) => tags.includes(t))) : pool;
  const open = tagged.filter((q) => !blocked.has(q.id));
  const candidates = (open.length ? open : tagged.filter((q) => !exclude.includes(q.id)))
    .map((q) => ({ ...q, difficulty: q.difficulty as Difficulty, lastSeenAt: lastSeen.get(q.id) ?? null }));

  // Missed the previous question in this session → one similar question (same difficulty, shared tag).
  const missedJustNow = last && !last.correct && exclude.includes(last.q.id);
  const want = forced ?? (missedJustNow ? (last.q.difficulty as Difficulty) : targetDifficulty(state?.theta ?? 0, Math.random));
  const nearest=candidates.filter(c=>c.difficulty===want);
  const broad=nearest.length>=8 ? nearest : candidates;
  const pick = exploratory ? broad[Math.floor(Math.random()*broad.length)] : pickQuestion(candidates, want, now, Math.random, missedJustNow ? last.q.tags : []);
  if (!pick) return null;
  const [q] = await db.select().from(questions).where(eq(questions.id, pick.id));
  return q ?? null;
}

/** Per-question countdown for a set: SAT pace when on; when auto, only for skills that are strong but slow. */
export async function timeLimitFor(userId: string, q: Question, timing: Timing | undefined, database: typeof db | Tx = db): Promise<number | null> {
  const sec = q.section as "rw" | "math";
  if (timing === "on") return TARGET_SECONDS[sec];
  if (timing !== "auto") return null;
  const [st] = await database.select().from(skillState).where(and(eq(skillState.userId, userId), eq(skillState.skillId, q.skillId)));
  if (!st?.n) return null;
  const strong = ["strong", "mastered"].includes(status(st.theta, true));
  return strong && pace(st.totalTimeMs / st.n, sec) === "slow" ? TARGET_SECONDS[sec] : null;
}

export type PracticeSelection = {
  mode: PracticeMode; skillId?: string; exclude: string[]; difficulty?: SetDifficulty; ids?: string[];
  skillIds?: string[]; tags?: string[]; timing?: Timing;
  context?: DeliveryContext; exploratory?: boolean; paper?: { nonce: string; count: number };
};
export async function selectPracticeQuestion(userId: string, profile: Profile, input: PracticeSelection) {
  if (input.mode === "set" && ((input.tags?.length ?? 0) > 1 || input.tags?.some(tag => tag !== "desmos"))) {
    throw new DeliveryBlocked("Custom practice is no longer available.");
  }
  const now = new Date();
  // Never serve a question from one of the student's unfinished tests: it couldn't be answered here (that would
  // reveal a live test question's answer), so practice would be stuck on it.
  const exclude = [...input.exclude, ...(await runningTestQuestionIds(userId))];
  let q: Question | null = null;
  const forced = input.difficulty === "mixed" ? undefined : input.difficulty;

  if (input.mode === "list") {
    // A hand-picked list (question bank): the first one not answered yet in this session, in the given order.
    const nextId = (input.ids ?? []).find((id) => !exclude.includes(id));
    if (nextId) q = (await db.select().from(questions).where(and(eq(questions.id, nextId), eq(questions.status, "active"), availableQuestion(userId))))[0] ?? null;
  } else if (input.mode === "review") {
    q = await dueReview(userId, now, exclude, input.skillId);
  } else if (input.mode === "set") {
    // Rotate through the chosen skills (Auto = this week's focus, then priority order as a fallback).
    let skills = (input.skillIds ?? []).filter((s) => SKILL_BY_ID[s]);
    let rotateOver = skills.length;
    if (!skills.length) {
      const focus = await ensureWeeklyFocus(userId, profile, now);
      skills = [...new Set([...focus, ...(await skillsByPriority(userId, profile)).map((s) => s.skillId)])];
      rotateOver = Math.min(skills.length, Math.max(1, focus.length));
    }
    const start = rotateOver ? input.exclude.length % rotateOver : 0;
    for (const skillId of [...skills.slice(start, rotateOver), ...skills.slice(0, start), ...skills.slice(rotateOver)]) {
      const want = input.difficulty === "mixed" ? ((1 + Math.floor(Math.random() * 3)) as Difficulty) : forced;
      q = await pickInSkill(userId, skillId, exclude, now, want, input.tags);
      if (q) break;
    }
  } else if (input.mode === "skill") {
    if (!input.skillId || !SKILL_BY_ID[input.skillId]) return null;
    q = await pickInSkill(userId, input.skillId, exclude, now, forced, [], input.exploratory);
  } else {
    // Smart: weekly focus, switching skill every 5 answers today; every 6th question is a due review.
    // ponytail: "today" = last 24h, not the local calendar day; switch to localDate() if rotation feels off.
    const startOfDay = new Date(now.getTime() - 24 * 3_600_000);
    const [{ c: today }] = (await db.select({ c: count() }).from(attempts)
      .where(and(eq(attempts.userId, userId), gte(attempts.createdAt, startOfDay), inArray(attempts.context, ["practice", "review"])))) as [{ c: number }];
    if (today > 0 && today % 6 === 5) q = await dueReview(userId, now, exclude);
    if (!q) {
      const focus = await ensureWeeklyFocus(userId, profile, now);
      const rotated = focus.length ? [...focus.slice(Math.floor(today / 5) % focus.length), ...focus] : [];
      const fallback = (await skillsByPriority(userId, profile)).map((s) => s.skillId);
      for (const skillId of [...new Set([...rotated, ...fallback])]) {
        q = await pickInSkill(userId, skillId, exclude, now);
        if (q) break;
      }
    }
  }
  return q;
}
export async function nextQuestion(userId: string, profile: Profile, input: PracticeSelection) {
  const now=new Date();
  const q=await selectPracticeQuestion(userId,profile,input);
  if (!q) return null;
  await servePractice(userId, q, input.context ?? await deliveryContext(), input.paper);
  const timeLimitS = input.mode === "set" ? await timeLimitFor(userId, q, input.timing) : null;
  const [reviewsDue, [saved]] = await Promise.all([
    countDueReviews(userId, now),
    db.select({ id: bookmarks.questionId }).from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.questionId, q.id))),
  ]);
  return { question: toPublic(q, userId), reviewsDue, timeLimitS, bookmarked: !!saved };
}

/**
 * Has this question already been handed to this student (served in practice, or answered anywhere)? Answers,
 * bookmarks and tutor hints only work on those, so a script can't read the bank by sending question ids directly
 * and skipping the serve limits.
 */
export async function wasGiven(userId: string, questionId: string) {
  const [served, answered, exposed] = await Promise.all([
    db.select({ id: questionServes.questionId }).from(questionServes)
      .where(and(eq(questionServes.userId, userId), eq(questionServes.questionId, questionId))).limit(1),
    db.select({ id: attempts.id }).from(attempts)
      .where(and(eq(attempts.userId, userId), eq(attempts.questionId, questionId))).limit(1),
    db.select({id:questionExposures.questionId}).from(questionExposures).where(and(eq(questionExposures.userId,userId),eq(questionExposures.questionId,questionId))).limit(1),
  ]);
  return served.length > 0 || answered.length > 0 || exposed.length > 0;
}

/** Reload an already-served, still-unanswered question without advancing or restarting its serve clock. */
export async function resumeQuestion(userId:string,questionId:string,timing:Timing|undefined) {
  const [[q],[served],[last],live,[saved]]=await Promise.all([
    db.select().from(questions).where(and(eq(questions.id,questionId),eq(questions.status,'active'))),
    db.select().from(questionServes).where(and(eq(questionServes.userId,userId),eq(questionServes.questionId,questionId))),
    db.select({at:attempts.createdAt}).from(attempts).where(and(eq(attempts.userId,userId),eq(attempts.questionId,questionId))).orderBy(desc(attempts.createdAt)).limit(1),
    inRunningTest(userId,questionId),
    db.select().from(bookmarks).where(and(eq(bookmarks.userId,userId),eq(bookmarks.questionId,questionId))),
  ]);
  if(!q || !served || served.servedAt.getTime() < Date.now()-DELIVERY_POLICY.pendingMs || live || last && last.at>=served.servedAt) return null;
  return {question:toPublic(q, userId),reviewsDue:await countDueReviews(userId),timeLimitS:await timeLimitFor(userId,q,timing),bookmarked:!!saved};
}

export async function submitAnswer(userId: string, input: {
  questionId: string; response: string | null; timeMs: number; confidence: 1 | 2 | 3;
}, transaction?: Tx, session?: { id: string; servedAt: Date }) {
  const database=transaction??db;
  const [[q], live, [served]] = await Promise.all([
    database.select().from(questions).where(eq(questions.id, input.questionId)),
    inRunningTest(userId, input.questionId, database), // practice would reveal the answer to a question in a live test
    database.select({ at: questionServes.servedAt }).from(questionServes)
      .where(and(eq(questionServes.userId, userId), eq(questionServes.questionId, input.questionId))),
  ]);
  // One answer per serve: the question must have been handed to this student and not answered since. No answering
  // questions you weren't given, and no trying A, then B, then C on the same serve.
  if (!q || live || !served || q.status !== "active") return null;
  const timeMs = serverCappedTime(input.timeMs, served?.at ?? null, new Date());
  const run = async (tx: Tx) => {
    const [currentServe]=await tx.select().from(questionServes)
      .where(and(eq(questionServes.userId,userId),eq(questionServes.questionId,q.id))).for('update');
    const [last]=await tx.select().from(attempts).where(and(eq(attempts.userId,userId),eq(attempts.questionId,q.id))).orderBy(desc(attempts.createdAt)).limit(1);
    if (session && currentServe?.servedAt.getTime() !== session.servedAt.getTime()) return null;
    if(!currentServe || last && last.createdAt>=currentServe.servedAt) {
      if(last && last.response===input.response) return {correct:last.correct,attemptId:last.id,revealed:toRevealed(q, userId),masteryBefore:masteryPct(last.thetaBefore),masteryAfter:masteryPct(last.thetaAfter),mistakeGuess:last.mistakeType,skillName:SKILL_BY_ID[q.skillId]?.name??q.skillId};
      return null;
    }
    if (Date.now() - currentServe.servedAt.getTime() < DELIVERY_POLICY.minimumAnswerMs)
      throw new DeliveryBlocked("Take a moment to read the question before submitting.");
    // A question in the user's review queue is always recorded as a review, whatever the client says.
    const [queued] = await tx.select().from(reviewItems)
      .where(and(eq(reviewItems.userId, userId), eq(reviewItems.questionId, q.id)));
    const r = await recordAttempt(tx, userId, q, {
      response: input.response, timeMs, confidence: input.confidence,
      context: queued ? "review" : "practice", sessionId: session?.id, now: new Date(),
    });
    return {
      correct: r.correct, attemptId: r.attemptId, revealed: toRevealed(q, userId),
      masteryBefore: masteryPct(r.thetaBefore), masteryAfter: masteryPct(r.thetaAfter),
      mistakeGuess: r.mistakeType, skillName: SKILL_BY_ID[q.skillId]?.name ?? q.skillId,
    };
  };
  return transaction ? run(transaction) : db.transaction(run);
}

/** Active question tags per skill (the sub-skills), for pickers and the skill page. */
export const tagsBySkill = memo(600_000, async (): Promise<Record<string, string[]>> => {
  const rows = await db.select({ skillId: questions.skillId, tag: sql<string>`t.tag` }).from(questions)
    .innerJoin(sql`jsonb_array_elements_text(${questions.tags}) as t(tag)`, sql`true`)
    .where(eq(questions.status, "active")).groupBy(questions.skillId, sql`t.tag`).orderBy(sql`t.tag`);
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.skillId] ??= []).push(r.tag);
  return out;
});

/** Skill-page performance extras: confidence mix, last 10, diagnostic result, per-tag accuracy. */
export async function skillStats(userId: string, skillId: string) {
  const mine = and(eq(attempts.userId, userId), eq(attempts.skillId, skillId));
  const nc = { n: sql<number>`count(*)::int`, c: sql<number>`count(*) filter (where ${attempts.correct})::int` };
  const [confidence, recent, [diagnostic], byTag] = await Promise.all([
    db.select({ confidence: attempts.confidence, n: nc.n }).from(attempts)
      .where(and(mine, isNotNull(attempts.confidence))).groupBy(attempts.confidence),
    db.select({ correct: attempts.correct }).from(attempts).where(mine).orderBy(desc(attempts.createdAt)).limit(10),
    db.select(nc).from(attempts).where(and(mine, eq(attempts.context, "diagnostic"))),
    db.select({ tag: sql<string>`t.tag`, ...nc }).from(attempts).innerJoin(questions, eq(questions.id, attempts.questionId))
      .innerJoin(sql`jsonb_array_elements_text(${questions.tags}) as t(tag)`, sql`true`)
      .where(mine).groupBy(sql`t.tag`).orderBy(sql`count(*) desc`),
  ]);
  return {
    confidence: confidence.map((r) => ({ confidence: r.confidence as 1 | 2 | 3, n: r.n })),
    recent: { n: recent.length, correct: recent.filter((r) => r.correct).length },
    diagnostic: diagnostic ?? { n: 0, c: 0 },
    byTag,
  };
}

export type BankStatus = "new" | "correct" | "incorrect";
export const QUESTION_BANK_PAGE_SIZE = 10;
export type BankFilters = {
  section?: "math" | "rw"; skillId?: string; difficulty?: 1 | 2 | 3;
  status?: BankStatus | "saved"; page?: number;
};

/** Personal history only. Fresh questions are generated sets, never an enumerable catalogue. */
export async function questionBank(userId: string, filters: BankFilters = {}) {
  const latest = db.selectDistinctOn([attempts.questionId], { questionId: attempts.questionId, correct: attempts.correct })
    .from(attempts).where(eq(attempts.userId,userId)).orderBy(attempts.questionId,desc(attempts.createdAt)).as("latest");
  const matches = and(filters.section ? eq(questions.section,filters.section) : undefined,
    filters.skillId ? eq(questions.skillId,filters.skillId) : undefined,
    filters.difficulty ? eq(questions.difficulty,filters.difficulty) : undefined,
    filters.status === "correct" ? eq(latest.correct,true) : filters.status === "incorrect" ? eq(latest.correct,false) : undefined,
    filters.status === "saved" ? sql`exists(select 1 from bookmarks b where b.user_id=${userId} and b.question_id=${questions.id})` : undefined,
    filters.status === "new" ? sql`false` : undefined);
  const rows = await db.select({id:questions.id,skillId:questions.skillId,section:questions.section,difficulty:questions.difficulty,
    stem:questions.stemMd,passage:questions.passageMd,last:latest.correct,
    saved:sql<boolean>`exists(select 1 from bookmarks b where b.user_id=${userId} and b.question_id=${questions.id})`})
    .from(latest).innerJoin(questions,eq(questions.id,latest.questionId)).where(matches).limit(10);
  const [counts] = await db.select({attempted:count(),correct:sql<number>`count(*) filter(where ${latest.correct})::int`,incorrect:sql<number>`count(*) filter(where not ${latest.correct})::int`}).from(latest);
  return {rows: rows.map(r=>({...r,status:r.last?"correct":"incorrect"})),counts:counts!};
}
