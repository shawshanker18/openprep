import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { generateRemix, type RemixSource } from "./remix-model";

const source: RemixSource = { type: "mcq", passageMd: null, stemMd: "If 2x = 4, what is x?", choices: [{ id: "A", md: "1" }, { id: "B", md: "2" }, { id: "C", md: "3" }, { id: "D", md: "4" }], answer: { choice: "B" }, explanationMd: "Divide both sides by 2.", difficulty: 1, skillId: "skill", section: "math" };
const draft = { passageMd: null, stemMd: "If 3x = 12, what is x?", choices: [{ id: "A", md: "2" }, { id: "B", md: "3" }, { id: "C", md: "4" }, { id: "D", md: "5" }], answer: { choice: "C" }, explanationMd: "Divide both sides by 3.", choiceRationales: null };
// Mistral's reasoning models send content as thinking and text blocks, not as a plain string.
const reply = (text: string) => Response.json({
  id: "cmpl", object: "chat.completion", created: 1, model: "test-model",
  choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: [{ type: "thinking", thinking: [{ type: "text", text: "Working it out." }] }, { type: "text", text }] } }],
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
});

beforeEach(() => { vi.stubEnv("MISTRAL_API_KEY", "test-key"); vi.stubEnv("REMIX_MODEL", "test-model"); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("reads a reply made of thinking and text blocks", async () => {
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => reply(JSON.stringify(String(init.body).includes("You solve SAT") ? { answer: "C" } : draft)));
  vi.stubGlobal("fetch", fetchMock);
  await expect(generateRemix(source, "same")).resolves.toMatchObject({ stemMd: draft.stemMd, answer: { choice: "C" } });
  expect(String(fetchMock.mock.calls[0]![0])).toBe("https://api.mistral.ai/v1/chat/completions");
});
