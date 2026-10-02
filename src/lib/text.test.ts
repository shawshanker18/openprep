import { expect, it } from "vitest";
import { text } from "./text";

it("text() rejects NUL bytes (Postgres can't store them) and keeps everything else", () => {
  expect(text().safeParse("a\0b").success).toBe(false);
  expect(text().max(8).safeParse("A").success).toBe(true);
  expect(text().safeParse("émoji 🙂 <b>&\"'").success).toBe(true);
});
