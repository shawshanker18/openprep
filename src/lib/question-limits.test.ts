import { expect, it } from "vitest";
import { ACCEPTED_SET_SIZES, MAX_QUESTIONS_PER_SET, SET_SIZES, clampSetSize } from "./question-limits";
import { PaperConfigSchema } from "@/server/papers";

it("no set or test can be larger than the limit of 50", () => {
  expect(MAX_QUESTIONS_PER_SET).toBe(50);
  expect(Math.max(...SET_SIZES)).toBe(MAX_QUESTIONS_PER_SET);
  expect(clampSetSize(100)).toBe(50);
  expect(clampSetSize(0)).toBe(1);
  expect(clampSetSize(Number.NaN)).toBe(1);
  expect(clampSetSize(23)).toBe(23);
});

it("the server accepts exactly the sizes the picker offers (plus 5 for lesson links)", () => {
  for (const n of SET_SIZES) expect(PaperConfigSchema.safeParse({ mode: "set", count: n }).success, String(n)).toBe(true);
  expect(ACCEPTED_SET_SIZES).toContain(5);
  expect(PaperConfigSchema.safeParse({ mode: "set", count: 60 }).success).toBe(false);
  expect(PaperConfigSchema.safeParse({ mode: "set", count: 15 }).success).toBe(false);
});
