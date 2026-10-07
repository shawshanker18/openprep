import { expect, it } from "vitest";
import { safely } from "./safely";

it("returns the value when the work finishes in time", async () => {
  expect(await safely(Promise.resolve(7), 0, 500)).toBe(7);
  expect(await safely(async () => "ok", "fallback", 500)).toBe("ok");
});

it("falls back when the work fails, even synchronously", async () => {
  expect(await safely(Promise.reject(new Error("db down")), "fallback", 500)).toBe("fallback");
  expect(await safely(() => { throw new Error("boom"); }, "fallback", 500)).toBe("fallback");
});

it("falls back instead of hanging when the work never finishes", async () => {
  const started = Date.now();
  expect(await safely(new Promise<string>(() => {}), "fallback", 40)).toBe("fallback");
  expect(Date.now() - started).toBeLessThan(1000);
});

it("does not raise an unhandled rejection when work fails after the timeout", async () => {
  const late = new Promise<string>((_, reject) => setTimeout(() => reject(new Error("late")), 60));
  expect(await safely(late, "fallback", 10)).toBe("fallback");
  await new Promise((resolve) => setTimeout(resolve, 120)); // would crash the run if the rejection were unhandled
});
