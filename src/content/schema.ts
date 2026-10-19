// Zod schemas for content files (spec 02 §3) and the file → DB row mapping.
import { z } from "zod";
import { SKILL_BY_ID } from "./taxonomy";

const kebab = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "tags must be kebab-case");
const numeric = z.string().regex(/^-?(\d+\.?\d*|\.\d+)(\/\d+)?$/, "SPR answers must be a decimal or fraction");

const common = {
  id: z.string().regex(/^[a-z0-9-]+-\d{4}$/, "id must be <skill-id>-<4 digits>"),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  passage: z.string().min(1).optional(),
  stem: z.string().min(1),
  explanation: z.string().min(40, "explanation must be at least 40 characters"),
  fastMethod: z.string().min(1).optional(),
  desmos: z.object({ expressions: z.array(z.string().min(1)).min(1), steps: z.string().min(1) }).strict().optional(),
  tags: z.array(kebab).default([]),
  source: z.string().optional(),
  version: z.number().int().min(1).optional(),
};

const Mcq = z.object({
  ...common,
  type: z.literal("mcq"),
  choices: z.array(z.string().min(1)).length(4),
  answer: z.enum(["A", "B", "C", "D"]),
  rationales: z.partialRecord(z.enum(["A", "B", "C", "D"]), z.string().min(1)),
}).strict();

const Spr = z.object({
  ...common,
  type: z.literal("spr"),
  answer: z.array(numeric).min(1),
}).strict();

export const QuestionFileSchema = z.array(z.discriminatedUnion("type", [Mcq, Spr]));
export type ContentQuestion = z.infer<typeof QuestionFileSchema>[number];

const LETTERS = ["A", "B", "C", "D"] as const;

export function toRow(skillId: string, q: ContentQuestion) {
  const skill = SKILL_BY_ID[skillId]!;
  return {
    id: q.id,
    skillId,
    section: skill.section,
    domain: skill.domain,
    difficulty: q.difficulty,
    type: q.type,
    passageMd: q.passage ?? null,
    stemMd: q.stem,
    choices: q.type === "mcq" ? q.choices.map((md, i) => ({ id: LETTERS[i]!, md })) : null,
    answer: q.type === "mcq" ? { choice: q.answer } : { accepted: q.answer },
    explanationMd: q.explanation,
    choiceRationales: q.type === "mcq" ? q.rationales : null,
    fastMethodMd: q.fastMethod ?? null,
    desmos: q.desmos ? { expressions: q.desmos.expressions, stepsMd: q.desmos.steps } : null,
    tags: q.tags,
    status: "active",
    version: q.version ?? 1,
  };
}

export const LESSON_HEADINGS = [
  "What this skill is", "Learn the idea", "Formulas and rules", "Worked example 1 (easy)",
  "Worked example 2 (SAT-level)", "Common traps", "The fast way (and when to use Desmos)",
] as const;
