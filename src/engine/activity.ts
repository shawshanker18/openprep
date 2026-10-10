// Activity heatmap: one square per local day, GitHub-style. Pure, so the grid and streaks are easy to test.
export type DayRow = { day: string; questions: number; minutes: number; tests: number };
export type Cell = DayRow & { level: 0 | 1 | 2 | 3 | 4; future: boolean };
export type Activity = {
  weeks: Cell[][]; // columns are weeks (Monday first), 7 cells each
  activeDays: number; questions: number; minutes: number; tests: number;
  currentStreak: number; longestStreak: number;
};

const DAY = 86_400_000;
const at = (d: string) => Date.parse(`${d}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const active = (r: Pick<DayRow, "questions" | "tests">) => r.questions > 0 || r.tests > 0;

/** `today` is the student's local date (YYYY-MM-DD); rows are local-day totals. Shows the last `weeks` weeks ending this week. */
export function buildActivity(rows: DayRow[], today: string, weeks = 26): Activity {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const thisMonday = at(today) - ((new Date(at(today)).getUTCDay() + 6) % 7) * DAY;
  const start = thisMonday - (weeks - 1) * 7 * DAY;
  const max = Math.max(1, ...rows.filter((r) => r.day >= iso(start) && r.day <= today).map((r) => r.questions));
  const cells: Cell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = iso(start + (w * 7 + d) * DAY);
      const r = byDay.get(day) ?? { day, questions: 0, minutes: 0, tests: 0 };
      const level = !active(r) ? 0 : (Math.min(4, Math.max(1, Math.ceil((4 * r.questions) / max))) as 1 | 2 | 3 | 4);
      col.push({ ...r, level, future: day > today });
    }
    cells.push(col);
  }
  const days = cells.flat().filter((c) => !c.future);
  let longest = 0, run = 0;
  for (const c of days) { run = active(c) ? run + 1 : 0; longest = Math.max(longest, run); }
  // Today doesn't break a streak until it's over: count back from yesterday if nothing is logged yet today.
  let current = 0, i = days.length - 1;
  if (i >= 0 && !active(days[i]!)) i--;
  for (; i >= 0 && active(days[i]!); i--) current++;
  return {
    weeks: cells, activeDays: days.filter(active).length, longestStreak: longest, currentStreak: current,
    questions: days.reduce((a, c) => a + c.questions, 0), minutes: days.reduce((a, c) => a + c.minutes, 0), tests: days.reduce((a, c) => a + c.tests, 0),
  };
}
