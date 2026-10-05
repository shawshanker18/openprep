import { expect, it } from "vitest";
import { toPublic } from "./questions";
import type { Question } from "@/db/schema";

it("toPublic never leaks the answer or its hints", () => {
  const q: Question = {
    id: "m-alg-lin1-0001", skillId: "m-alg-lin1", section: "math", domain: "m-alg", difficulty: 3, type: "mcq",
    passageMd: null, stemMd: "stem", choices: [{ id: "A", md: "1" }], answer: { choice: "A" },
    explanationMd: "secret", choiceRationales: { B: "x" }, fastMethodMd: "fast", desmos: { expressions: [], stepsMd: "" },
    tags: ["t"], status: "active", version: 1,
  };
  const pub = toPublic(q,"alice");
  for (const k of ["answer", "explanationMd", "choiceRationales", "fastMethodMd", "desmos", "difficulty", "tags", "skillId", "section", "domain", "type"])
    expect(pub).not.toHaveProperty(k);
});
