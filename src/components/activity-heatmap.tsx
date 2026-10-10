import type { Activity, Cell } from "@/engine/activity";

const LEVEL = [
  "bg-muted",
  "bg-blue-200 dark:bg-blue-950",
  "bg-blue-300 dark:bg-blue-800",
  "bg-blue-400 dark:bg-blue-600",
  "bg-blue-600 dark:bg-blue-400",
];
const WEEKDAY = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const utc = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { ...o, timeZone: "UTC" });
const plural = (n: number, w: string) => `${n.toLocaleString()} ${w}${n === 1 ? "" : "s"}`;
const duration = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`);
const tip = (c: Cell) => c.questions || c.tests
  ? `${[c.questions && plural(c.questions, "question"), c.tests && plural(c.tests, "test"), c.minutes && duration(c.minutes)].filter(Boolean).join(" · ")} on ${utc(c.day, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`
  : `No activity on ${utc(c.day, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`;

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl border bg-card p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

/** GitHub-style year grid that stretches to the available width: a column per week (Monday first), a square per day. */
export function ActivityHeatmap({ activity: a }: { activity: Activity }) {
  const cols = a.weeks.length;
  const month = (i: number) => utc(a.weeks[i]![0]!.day, { month: "short" });
  const delta = a.thisWeek - a.lastWeek;
  const perDay = a.activeDays ? Math.round(a.questions / a.activeDays) : 0;
  return (
    <section className="flex flex-col gap-4" aria-label="Activity">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Activity</h2>
        <p className="text-sm text-muted-foreground">{plural(a.questions, "question")} in the last year</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Current streak" value={plural(a.currentStreak, "day")} sub={a.currentStreak ? "Keep it going today" : "Answer a question to start one"} />
        <Tile label="Longest streak" value={plural(a.longestStreak, "day")} />
        <Tile label="Active days" value={String(a.activeDays)} sub={a.activeDays ? `${perDay} questions on an average one` : undefined} />
        <Tile label="Questions answered" value={a.questions.toLocaleString()} sub={`${plural(a.tests, "test")} finished`} />
        <Tile label="Time practicing" value={duration(a.minutes)} />
        <Tile label="This week" value={a.thisWeek.toLocaleString()} sub={a.lastWeek || a.thisWeek ? `questions · ${delta >= 0 ? "+" : "−"}${Math.abs(delta)} vs last week` : undefined} />
      </div>

      {/* rtl on the scroller makes a narrow screen open at the most recent weeks; the inner box stays ltr. */}
      <div className="rounded-xl border bg-card p-4 sm:p-5"><div dir="rtl" className="max-w-full overflow-x-auto">
        <div dir="ltr" className="flex min-w-[44rem] flex-col gap-1">
          <div className="grid h-4 gap-[3px]" style={{ gridTemplateColumns: `2.25rem repeat(${cols}, minmax(0, 1fr))` }}>
            <span />
            {a.weeks.map((_, i) => <span key={i} className="whitespace-nowrap text-xs leading-4 text-muted-foreground">{(i === 0 || month(i) !== month(i - 1)) && i < cols - 2 ? month(i) : ""}</span>)}
          </div>
          {/* The weekday labels are the grid's first column, so every label sits exactly on its row; they stay put while the weeks scroll. */}
          <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `2.25rem repeat(${cols}, minmax(0, 1fr))` }}>
            {WEEKDAY.map((d) => <span key={d} translate="no" className="sticky left-0 z-10 flex items-center bg-card text-xs leading-none text-muted-foreground">{d.slice(0, 3)}</span>)}
            {a.weeks.flat().map((c) => (
              <span key={c.day} title={c.future ? undefined : tip(c)} aria-label={c.future ? undefined : tip(c)}
                className={`aspect-square rounded-[3px] ${c.future ? "invisible" : `${LEVEL[c.level]} hover:ring-2 hover:ring-foreground/40`}`} />
            ))}
          </div>
        </div>
      </div></div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>
          {a.bestDay ? <>Best day: <b className="font-medium text-foreground">{plural(a.bestDay.questions, "question")}</b> on {utc(a.bestDay.day, { month: "short", day: "numeric" })}</> : "Your busiest days will show up here."}
          {a.busiestWeekday != null && <> · Most active on <b className="font-medium text-foreground">{WEEKDAY[a.busiestWeekday]}s</b></>}
        </span>
        <span className="flex items-center gap-1.5">Less {LEVEL.map((l) => <span key={l} className={`size-3 rounded-[3px] ${l}`} />)} More</span>
      </div>
    </section>
  );
}
