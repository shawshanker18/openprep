import { expect, it } from "vitest";
import { mouseButtonDirection } from "./mouse-nav";

it("maps the mouse side buttons to back and forward and ignores the rest", () => {
  expect(mouseButtonDirection(3)).toBe(-1);
  expect(mouseButtonDirection(4)).toBe(1);
  for (const button of [0, 1, 2, 5]) expect(mouseButtonDirection(button)).toBe(0);
});
