import { expect, it } from "vitest";
import { SKILLS, shortSkillName } from "./taxonomy";

it("drops clarifying parentheses from skill names for compact lists", () => {
  expect(shortSkillName("Form, Structure, and Sense (grammar)")).toBe("Form, Structure, and Sense");
  expect(shortSkillName("Nonlinear Functions (quadratic, exponential, polynomial)")).toBe("Nonlinear Functions");
  expect(shortSkillName("Command of Evidence (Textual and Quantitative)")).toBe("Command of Evidence");
  expect(shortSkillName("Transitions")).toBe("Transitions");
});

it("never produces an empty or still-bracketed name for any skill", () => {
  for (const s of SKILLS) {
    const short = shortSkillName(s.name);
    expect(short.length).toBeGreaterThan(2);
    expect(short).not.toMatch(/[()]/);
  }
});
