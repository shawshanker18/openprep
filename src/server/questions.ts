// SECURITY-CRITICAL (spec 01 §6): the browser only ever sees PublicQuestion until the student has
// submitted (practice) or completed the whole session (tests). Never pass a full Question row as a prop.
import "server-only";
import type { Question } from "@/db/schema";

export type PublicQuestion = Pick<Question,
  "id" | "skillId" | "section" | "domain" | "type" | "passageMd" | "stemMd" | "choices">;
export type RevealedQuestion = PublicQuestion & Pick<Question,
  "answer" | "explanationMd" | "choiceRationales" | "fastMethodMd" | "desmos" | "difficulty">;

export const toPublic = (q: Question): PublicQuestion => ({
  id: q.id, skillId: q.skillId, section: q.section, domain: q.domain,
  type: q.type, passageMd: q.passageMd, stemMd: q.stemMd, choices: q.choices,
});

export const toRevealed = (q: Question): RevealedQuestion => ({
  ...toPublic(q), answer: q.answer, explanationMd: q.explanationMd, choiceRationales: q.choiceRationales,
  fastMethodMd: q.fastMethodMd, desmos: q.desmos, difficulty: q.difficulty,
});
