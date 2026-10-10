import { expect, it } from "vitest";
import { buildActivity, type DayRow } from "./activity";

const row = (day: string, questions: number, tests = 0): DayRow => ({ day, questions, minutes: questions, tests });
// 2026-10-10 is a Saturday.
const TODAY = "2026-10-10";

it("lays out Monday-first weeks ending this week, with later days of this week marked future", () => {
  const a = buildActivity([], TODAY, 4);
  expect(a.weeks).toHaveLength(4);
  expect(a.weeks[0]![0]!.day).toBe("2026-09-14"); // a Monday, three weeks before this week's Monday (Oct 5)
  expect(a.weeks[3]!.map((c) => c.day)).toEqual(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
  expect(a.weeks[3]![6]!.future).toBe(true);
  expect(a.weeks[3]![5]!.future).toBe(false);
});

it("scales levels to the busiest day and keeps any activity visible", () => {
  const a = buildActivity([row("2026-10-05", 40), row("2026-10-06", 10), row("2026-10-07", 1), row("2026-10-08", 0, 1)], TODAY, 2);
  const lv = (d: string) => a.weeks.flat().find((c) => c.day === d)!.level;
  expect([lv("2026-10-05"), lv("2026-10-06"), lv("2026-10-07"), lv("2026-10-08"), lv("2026-10-09")]).toEqual([4, 1, 1, 1, 0]);
});

it("counts streaks, and an empty today does not break the current one", () => {
  const a = buildActivity([row("2026-10-06", 5), row("2026-10-07", 5), row("2026-10-08", 5), row("2026-10-09", 5)], TODAY, 4);
  expect(a).toMatchObject({ currentStreak: 4, longestStreak: 4, activeDays: 4, questions: 20 });
  const b = buildActivity([row("2026-10-07", 5), row("2026-10-09", 5)], TODAY, 4);
  expect(b).toMatchObject({ currentStreak: 1, longestStreak: 1 });
  expect(buildActivity([row("2026-10-08", 5), row("2026-10-09", 5), row("2026-10-10", 1)], TODAY, 4).currentStreak).toBe(3);
});

it("ignores activity outside the window", () => {
  expect(buildActivity([row("2025-01-01", 99)], TODAY, 4)).toMatchObject({ activeDays: 0, questions: 0, longestStreak: 0 });
});

it("reports the best day, busiest weekday and this week against last", () => {
  const a = buildActivity([row("2026-09-28", 3), row("2026-10-05", 10), row("2026-10-06", 20), row("2026-10-13", 99)], TODAY, 4);
  expect(a.bestDay).toMatchObject({ day: "2026-10-06", questions: 20 });
  expect(a.busiestWeekday).toBe(1); // Tuesday
  expect({ thisWeek: a.thisWeek, lastWeek: a.lastWeek }).toEqual({ thisWeek: 30, lastWeek: 3 });
  expect(buildActivity([], TODAY, 4)).toMatchObject({ bestDay: null, busiestWeekday: null });
});
