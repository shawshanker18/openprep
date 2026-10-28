import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";
import type { Question } from "@/db/schema";
import type { Direction } from "@/lib/remix";

/** Mistral's OpenAI-compatible endpoint. REMIX_MODEL is the API id of GLM 5.3 Flash from the Mistral console. */
export function remixModel() {
  const key = process.env.MISTRAL_API_KEY, id = process.env.REMIX_MODEL;
  return key && id ? createOpenAI({ baseURL: "https://api.mistral.ai/v1", apiKey: key }).chat(id) : null;
}

export type RemixDraft = Pick<Question, "passageMd" | "stemMd" | "choices" | "answer" | "explanationMd" | "choiceRationales">;
export type RemixSource = Pick<Question, "type" | "passageMd" | "stemMd" | "choices" | "answer" | "explanationMd" | "difficulty" | "skillId" | "section">;

const Draft = z.object({
  passageMd: z.string().nullable().optional(),
  stemMd: z.string().min(10).max(4000),
  choices: z.array(z.object({ id: z.string(), md: z.string().min(1).max(1000) })).nullable().optional(),
  answer: z.union([z.object({ choice: z.string() }), z.object({ accepted: z.array(z.string().min(1)).min(1).max(8) })]),
  explanationMd: z.string().min(10).max(4000),
  choiceRationales: z.record(z.string(), z.string()).nullable().optional(),
});

const LEVEL: Record<Direction, string> = {
  easier: "slightly EASIER than the original: the same skill, but one fewer step or a simpler setup or friendlier numbers",
  same: "the SAME difficulty as the original: the same skill and number of steps, with a different scenario and different numbers",
  numbers: "a NUMBERS-ONLY variant: keep the wording, scenario, names, structure and skill exactly as the original, and change only the numbers and values, including the ones in the answer choices. Recompute the answer and make every choice work with the new values",
  harder: "slightly HARDER than the original: the same skill, but with one extra step, a less direct setup or a more tempting distractor",
};

const show = (q: Pick<RemixSource, "passageMd" | "stemMd" | "choices">) => [
  q.passageMd ? `Passage:\n${q.passageMd}` : "",
  `Question:\n${q.stemMd}`,
  q.choices ? `Choices:\n${q.choices.map((c) => `${c.id}) ${c.md}`).join("\n")}` : "(student-produced response)",
].filter(Boolean).join("\n\n");

const json = (text: string): unknown => {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
};
const norm = (s: string) => s.toLowerCase().replace(/[\s$,]/g, "");

/** Throws when the draft is malformed or does not match the shape of the source question. */
export function checkDraft(source: Pick<RemixSource, "type" | "stemMd">, raw: unknown): RemixDraft {
  const d = Draft.parse(raw);
  if (norm(d.stemMd) === norm(source.stemMd)) throw new Error("copied the original");
  if (source.type === "mcq") {
    const ids = d.choices?.map((c) => c.id) ?? [];
    if (ids.join("") !== "ABCD") throw new Error("choices must be A-D");
    if (!("choice" in d.answer) || !ids.includes(d.answer.choice)) throw new Error("answer must be one choice");
    if (new Set(d.choices!.map((c) => norm(c.md))).size !== 4) throw new Error("duplicate choices");
  } else if (d.choices?.length || !("accepted" in d.answer)) throw new Error("student-produced response needs accepted answers");
  return {
    passageMd: d.passageMd || null, stemMd: d.stemMd, choices: source.type === "mcq" ? d.choices! : null, answer: d.answer,
    explanationMd: d.explanationMd, choiceRationales: source.type === "mcq" ? d.choiceRationales ?? null : null,
  };
}

/** A second, independent solve: the draft is kept only when the model reaches the same answer without seeing it. */
async function solvesTo(model: NonNullable<ReturnType<typeof remixModel>>, d: RemixDraft) {
  const { text } = await generateText({
    model, temperature: 0,
    system: 'You solve SAT questions. Reply with JSON only: {"answer": "<letter, or the value for a student-produced response>"}.',
    prompt: show(d),
  });
  const got = norm(String((json(text) as { answer?: unknown }).answer ?? ""));
  return "choice" in d.answer ? got.replace(/[^a-d]/g, "") === norm(d.answer.choice) : d.answer.accepted.some((a) => norm(a) === got);
}

export async function generateRemix(source: RemixSource, direction: Direction): Promise<RemixDraft> {
  const model = remixModel();
  if (!model) throw new Error("Remixing isn't configured.");
  const fmt = source.type === "mcq"
    ? `"choices": [{"id":"A","md":"..."},{"id":"B","md":"..."},{"id":"C","md":"..."},{"id":"D","md":"..."}], "answer": {"choice":"A"}, "choiceRationales": {"A":"why","B":"why","C":"why","D":"why"}`
    : `"choices": null, "answer": {"accepted":["value","equivalent form"]}, "choiceRationales": null`;
  const system = `You write original SAT practice questions. Reply with one JSON object and nothing else:
{"passageMd": string or null, "stemMd": string, ${fmt}, "explanationMd": string}
Write the new question ${LEVEL[direction]}. Keep the same skill, SAT format, Markdown and LaTeX conventions as the original. ${direction === "numbers" ? "" : "Do not reuse the original's wording, names or numbers. "}Exactly one correct answer. The explanation is a short worked solution.`;
  let last: unknown;
  for (let i = 0; i < 2; i++) {
    try {
      const { text } = await generateText({ model, system, temperature: 0.7, prompt: `Original (skill ${source.skillId}, difficulty ${source.difficulty} of 3):\n\n${show(source)}` });
      const draft = checkDraft(source, json(text));
      if (await solvesTo(model, draft)) return draft;
      last = new Error("verification disagreed");
    } catch (e) { last = e; }
  }
  throw last instanceof Error ? last : new Error("remix failed");
}
