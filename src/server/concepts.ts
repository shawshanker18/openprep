// Conceptual practice: each SAT skill can have concepts. An admin writes a concept's explanation and picks its questions
// (active questions of that skill only). After a student finishes the skill's lesson they can practise one concept as a
// set. Admin writes re-check every rule here, whatever the form sent.
import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { conceptQuestions, questions, skillConcepts } from "@/db/schema";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { MAX_QUESTIONS_PER_SET } from "@/lib/question-limits";
import { audit } from "@/server/admin";
import { deliveryContext } from "@/server/delivery-context";
import { exposeQuestions } from "@/server/delivery";
import { publicId } from "@/server/questions";
import { createPracticeSession } from "@/server/practice-sessions";

export type Problem = { field: string; message: string };
export type Ok<T> = { ok: true; value: T } | { ok: false; problems: Problem[] };

/** Concepts of one skill for a student: the explanation and how many active questions the concept practises. */
export async function conceptsForSkill(skillId: string) {
  const rows = await db.select({ id: skillConcepts.id, title: skillConcepts.title, explanationMd: skillConcepts.explanationMd })
    .from(skillConcepts).where(eq(skillConcepts.skillId, skillId)).orderBy(asc(skillConcepts.sort), asc(skillConcepts.title));
  if (!rows.length) return [];
  const counts = await db.select({ conceptId: conceptQuestions.conceptId, n: sql<number>`count(*)::int` })
    .from(conceptQuestions).innerJoin(questions, eq(questions.id, conceptQuestions.questionId))
    .where(and(inArray(conceptQuestions.conceptId, rows.map((r) => r.id)), eq(questions.status, "active")))
    .groupBy(conceptQuestions.conceptId);
  const n = new Map(counts.map((c) => [c.conceptId, c.n]));
  return rows.map((r) => ({ ...r, questionCount: n.get(r.id) ?? 0 }));
}

/**
 * Start a practice set on one concept. Only the concept's active questions are used, and their ids are the student's own
 * opaque ids, so the set behaves like any other practice set. Returns the session id.
 */
export async function startConceptPractice(userId: string, conceptId: string, back?: string): Promise<string | null> {
  const [concept] = await db.select().from(skillConcepts).where(eq(skillConcepts.id, conceptId));
  if (!concept) return null;
  const active = await db.select({ id: questions.id }).from(conceptQuestions)
    .innerJoin(questions, eq(questions.id, conceptQuestions.questionId))
    .where(and(eq(conceptQuestions.conceptId, conceptId), eq(questions.status, "active"), eq(questions.pool, "study")))
    .orderBy(asc(questions.id)).limit(MAX_QUESTIONS_PER_SET);
  if (!active.length) return null;
  // Practice only accepts questions the student has been given, so record these as delivered first, through the same
  // ledger every other practice set uses (rate limits and exposure counts included).
  const context = await deliveryContext();
  await db.transaction((tx) => exposeQuestions(tx, userId, active.map((q) => ({ id: q.id, skillId: concept.skillId })), context));
  const ids = active.map((q) => publicId(q.id, userId));
  return createPracticeSession(userId, { mode: "list", ids, count: ids.length }, `Concept: ${concept.title}`, back);
}

/** Admins: the questions a concept may use. Study-pool only: test-pool questions are reserved for mock tests. */
export async function questionsForSkillAdmin(skillId: string) {
  return db.select({ id: questions.id, stemMd: questions.stemMd, difficulty: questions.difficulty, type: questions.type })
    .from(questions).where(and(eq(questions.skillId, skillId), eq(questions.status, "active"), eq(questions.pool, "study")))
    .orderBy(asc(questions.difficulty), asc(questions.id));
}

const ConceptForm = z.object({
  id: z.uuid().optional(),
  skillId: z.string().refine((s) => !!SKILL_BY_ID[s], "Unknown skill"),
  title: z.string().trim().min(1, "Give the concept a title").max(120),
  explanationMd: z.string().trim().max(8000, "Explanation is too long (8,000 characters at most)").default(""),
  sort: z.coerce.number().int().min(0).max(999).default(0),
  questionIds: z.array(z.string()).max(MAX_QUESTIONS_PER_SET).default([]),
});
export type ConceptInput = z.input<typeof ConceptForm>;

/**
 * Create or update a concept and replace its question set in one transaction. Every question must be an active question of
 * the concept's skill and in the study pool; anything else is refused, not silently dropped.
 */
export async function saveConcept(adminId: string, form: unknown): Promise<Ok<{ id: string }>> {
  const parsed = ConceptForm.safeParse(form);
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "form"), message: i.message })) };
  const input = parsed.data;
  const wanted = [...new Set(input.questionIds.filter(Boolean))];

  if (input.id) {
    const [existing] = await db.select({ skillId: skillConcepts.skillId }).from(skillConcepts).where(eq(skillConcepts.id, input.id));
    if (!existing) return { ok: false, problems: [{ field: "id", message: "That concept does not exist" }] };
    if (existing.skillId !== input.skillId) return { ok: false, problems: [{ field: "skillId", message: "A concept cannot move to another skill" }] };
  }
  if (wanted.length) {
    const found = await db.select({ id: questions.id }).from(questions)
      .where(and(inArray(questions.id, wanted), eq(questions.skillId, input.skillId), eq(questions.status, "active"), eq(questions.pool, "study")));
    const ok = new Set(found.map((q) => q.id));
    const bad = wanted.filter((id) => !ok.has(id));
    if (bad.length) return { ok: false, problems: [{ field: "questions", message: `${bad.length} selected question(s) are not active questions of this skill` }] };
  }

  const now = new Date();
  const id = await db.transaction(async (tx) => {
    const row = { skillId: input.skillId, title: input.title, explanationMd: input.explanationMd, sort: input.sort, updatedBy: adminId, updatedAt: now };
    let conceptId: string;
    if (input.id) {
      await tx.update(skillConcepts).set(row).where(eq(skillConcepts.id, input.id));
      conceptId = input.id;
    } else {
      const [created] = await tx.insert(skillConcepts).values({ ...row, createdBy: adminId }).returning({ id: skillConcepts.id });
      conceptId = created!.id;
    }
    await tx.delete(conceptQuestions).where(eq(conceptQuestions.conceptId, conceptId));
    if (wanted.length) await tx.insert(conceptQuestions).values(wanted.map((questionId) => ({ conceptId, questionId, addedBy: adminId })));
    return conceptId;
  });
  await audit(adminId, input.id ? "concept.update" : "concept.create", id, { skillId: input.skillId, questions: wanted.length });
  return { ok: true, value: { id } };
}

/** Remove a concept and its question links. The questions themselves are untouched. */
export async function deleteConcept(adminId: string, id: string): Promise<Ok<{ removed: boolean }>> {
  if (!z.uuid().safeParse(id).success) return { ok: false, problems: [{ field: "id", message: "Concept not found" }] };
  const gone = await db.delete(skillConcepts).where(eq(skillConcepts.id, id)).returning({ id: skillConcepts.id });
  if (gone.length) await audit(adminId, "concept.delete", id);
  return { ok: true, value: { removed: gone.length > 0 } };
}

/**
 * The questions for a skill checkpoint: up to 3 of the skill's concept questions, then skill questions to make `size`.
 * Study pool only, active only, in that order.
 */
export async function checkpointQuestions(skillId: string, size = 5) {
  const fromConcepts = await db.select({ id: questions.id, skillId: questions.skillId }).from(conceptQuestions)
    .innerJoin(skillConcepts, eq(skillConcepts.id, conceptQuestions.conceptId))
    .innerJoin(questions, eq(questions.id, conceptQuestions.questionId))
    .where(and(eq(skillConcepts.skillId, skillId), eq(questions.status, "active"), eq(questions.pool, "study")))
    .orderBy(sql`random()`).limit(Math.min(3, size));
  // A question can sit in more than one concept, so drop repeats before counting.
  const unique = [...new Map(fromConcepts.map((q) => [q.id, q])).values()];
  const taken = new Set(unique.map((q) => q.id));
  const need = size - unique.length;
  const picks = [...unique];
  if (need > 0) {
    const candidates = await db.select({ id: questions.id, skillId: questions.skillId }).from(questions)
      .where(and(eq(questions.skillId, skillId), eq(questions.status, "active"), eq(questions.pool, "study")))
      .orderBy(sql`random()`).limit(need + taken.size);
    for (const q of candidates) if (!taken.has(q.id) && picks.length < size) picks.push(q);
  }
  return picks;
}

/** Start a checkpoint set for a skill. Questions are recorded as given, through the same ledger as any practice. */
export async function startCheckpoint(userId: string, skillId: string, title: string, back?: string): Promise<string | null> {
  const picks = await checkpointQuestions(skillId);
  if (!picks.length) return null;
  const context = await deliveryContext();
  await db.transaction((tx) => exposeQuestions(tx, userId, picks, context));
  const ids = picks.map((q) => publicId(q.id, userId));
  return createPracticeSession(userId, { mode: "list", ids, count: ids.length }, title, back);
}
