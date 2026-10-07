import { expect, it, vi } from "vitest";
import { DatabaseTimeout, withDeadline } from "./deadline";

it("returns the result when the work finishes in time", async () => {
  const onTimeout = vi.fn();
  expect(await withDeadline(Promise.resolve(42), 200, onTimeout)).toBe(42);
  expect(onTimeout).not.toHaveBeenCalled();
});

it("fails fast and runs the recovery when the work never finishes", async () => {
  const onTimeout = vi.fn();
  const started = Date.now();
  await expect(withDeadline(new Promise(() => {}), 40, onTimeout)).rejects.toBeInstanceOf(DatabaseTimeout);
  expect(onTimeout).toHaveBeenCalledOnce();
  expect(Date.now() - started).toBeLessThan(1000);
});

it("passes the work's own error through without recovery", async () => {
  const onTimeout = vi.fn();
  await expect(withDeadline(Promise.reject(new Error("bad query")), 200, onTimeout)).rejects.toThrow("bad query");
  expect(onTimeout).not.toHaveBeenCalled();
});

it("does not raise an unhandled rejection when the work fails after the deadline", async () => {
  const late = new Promise((_, reject) => setTimeout(() => reject(new Error("late")), 60));
  await expect(withDeadline(late, 10)).rejects.toBeInstanceOf(DatabaseTimeout);
  await new Promise((resolve) => setTimeout(resolve, 120));
});
