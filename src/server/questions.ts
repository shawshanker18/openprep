// SECURITY-CRITICAL (spec 01 §6): the browser only ever sees PublicQuestion until the student has
// submitted (practice) or completed the whole session (tests). Never pass a full Question row as a prop.
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attempts, questionExposures, questionServes, type Question } from "@/db/schema";
import { digest } from "./delivery-identity";
import { createAssetToken } from "./question-asset-token";

/** Account-specific IDs reveal neither numbering nor another account's coverage. */
export function publicId(id: string, userId: string) {
  if (!userId) throw new Error("Question access requires a user");
  return digest(`question:${userId}:${id}`).slice(0, 22);
}
/** Resolve only this user's delivered/answered questions, never a global bank map. */
async function ownedIds(userId: string) {
  const rows = await Promise.all([
    db.select({ id: questionExposures.questionId }).from(questionExposures).where(eq(questionExposures.userId, userId)),
    db.selectDistinct({ id: attempts.questionId }).from(attempts).where(eq(attempts.userId, userId)),
    db.select({ id: questionServes.questionId }).from(questionServes).where(eq(questionServes.userId, userId)),
  ]);
  return new Map(rows.flat().map(r => [publicId(r.id,userId),r.id]));
}
export async function internalId(pub: string, userId: string): Promise<string | null> {
  if (!userId || !/^[\w-]{22}$/.test(pub)) return null;
  return (await ownedIds(userId)).get(pub) ?? null;
}
export async function internalIds(pubs: string[], userId: string) {
  if(!userId) return [];
  const map=await ownedIds(userId);
  return pubs.map(pub=>map.get(pub)).filter((x): x is string => !!x);
}

export type PublicQuestion = Pick<Question,
  "id" | "passageMd" | "stemMd" | "choices" | "section" | "skillId" | "domain" | "difficulty"> & { copyRef: string };
export type RevealedQuestion = PublicQuestion & Pick<Question,
  "answer" | "explanationMd" | "choiceRationales" | "fastMethodMd" | "desmos">;

export function toPublic(q: Question, userId: string): PublicQuestion {
  const md = (s: string) => questionMarkdown(q,s,userId);
  return { id: publicId(q.id, userId), section: q.section, skillId: q.skillId, domain: q.domain, difficulty: q.difficulty, copyRef: digest(`copy:${userId}:${q.id}`).slice(0,16), passageMd: q.passageMd ? md(q.passageMd) : null, stemMd: md(q.stemMd),
    choices: q.choices?.map(c=>({...c,md:md(c.md)})) ?? null };
}
export function questionMarkdown(q:Pick<Question,'id'|'stemMd'|'passageMd'|'choices'>,s:string,userId:string) {
  return s.replace(/asset:\/\/([\w-]+)/g,(_,id:string)=>`/api/question-assets/${createAssetToken(userId, q.id, id)}/0`);
}

export const toRevealed = (q: Question, userId: string): RevealedQuestion => ({
  ...toPublic(q, userId), answer: q.answer, explanationMd: questionMarkdown(q,q.explanationMd,userId), choiceRationales: q.choiceRationales ? Object.fromEntries(Object.entries(q.choiceRationales).map(([id, md]) => [id, questionMarkdown(q,md,userId)])) : null,
  fastMethodMd: q.fastMethodMd ? questionMarkdown(q,q.fastMethodMd,userId) : null, desmos: q.desmos,
});
