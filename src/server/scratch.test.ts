// The course path: orientation is its own group, comes first, and keeps the completion key students already have.
import { describe, expect, it, vi } from "vitest";
vi.mock("@/db", () => ({ db: {} }));
const { scratchPath, GETTING_STARTED } = await import("./scratch");
const { ORIENTATION } = await import("@/content/getting-started");

describe("start-from-scratch path", () => {
  it("puts getting-started lessons first, in order", async () => {
    const steps = await scratchPath();
    const first = steps.slice(0, ORIENTATION.length);
    expect(first.map((s) => s.key)).toEqual(ORIENTATION.map((l) => l.key));
    expect(first.every((s) => s.group === GETTING_STARTED)).toBe(true);
  });

  it("keeps the completion key for 'What the SAT is' that existing students already have", async () => {
    const intro = (await scratchPath()).find((s) => s.key === "about-the-sat");
    expect(intro?.done).toBe("scratch:about-the-sat");
  });

  it("keeps orientation out of Maths and English", async () => {
    const steps = await scratchPath();
    const subject = steps.filter((s) => s.kind !== "intro");
    expect(subject.length).toBeGreaterThan(0);
    expect(subject.every((s) => s.group !== GETTING_STARTED)).toBe(true);
  });

  it("gives every step a unique key, so progress can never attach to the wrong lesson", async () => {
    const keys = (await scratchPath()).map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every orientation lesson a title and body", () => {
    for (const l of ORIENTATION) {
      expect(l.title.trim()).not.toBe("");
      expect(l.md.trim().length).toBeGreaterThan(100);
    }
  });
});
