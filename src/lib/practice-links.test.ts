import { expect, it } from "vitest";
import { backLabel, inBank, remixReturn, returnsToSession, sessionHref, startAfter } from "./practice-links";

it("marks question bank sessions in their link", () => {
  expect(sessionHref({ id: "s", back: "/question-bank" })).toBe("/practice?session=s&in=bank");
  expect(sessionHref({ id: "s", back: null })).toBe("/practice?session=s");
});
it("returns a remix to the question after the one remixed", () => {
  const back = remixReturn({ id: "bank", back: "/question-bank" }, 3);
  expect(back).toBe("/practice?session=bank&in=bank&next=3");
  expect(returnsToSession(back)).toBe(true);
  expect(inBank(back)).toBe(true);
  expect(backLabel(back)).toBe("Back to the question bank");
});
it("sends a remix of a remix back past the first remix's question", () => {
  const first = remixReturn({ id: "bank", back: "/question-bank" }, 3);
  expect(remixReturn({ id: "remix", back: first }, 0)).toBe(first);
});
it("works outside the question bank too", () => {
  const back = remixReturn({ id: "adaptive", back: null }, 1);
  expect(back).toBe("/practice?session=adaptive&next=1");
  expect(backLabel(back)).toBe("Back to your session");
});
it("moves on from the newest question, and jumps from an earlier one", () => {
  expect(startAfter(4, 4)).toEqual({ kind: "next", position: 4 });
  expect(startAfter(4, 1)).toEqual({ kind: "jump", position: 2 });
  expect(startAfter(4, 9)).toBeUndefined();
});
