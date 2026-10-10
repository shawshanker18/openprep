import type { Activity, Cell } from "@/engine/activity";

const LEVEL = [
  "bg-muted",
  "bg-blue-200 dark:bg-blue-950",
  "bg-blue-300 dark:bg-blue-800",
  "bg-blue-400 dark:bg-blue-600",
  "bg-blue-600 dark:bg-blue-400",
];
const TEXT = ["text-muted-foreground", "text-blue-900 dark:text-blue-200", "text-blue-950 dark:text-blue-100", "text-blue-950 dark:text-white", "text-white dark:text-blue-950"];
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

/** GitHub-style grid of the last 3 months, stretched to the available width: a column per week (Monday first), a cell per day showing its date and question count. */
export function ActivityHeatmap({ activity: a }: { activity: Activity }) {
  const cols = a.weeks.length;
  const month = (i: number) => utc(a.weeks[i]![0]!.day, { month: "short" });
  const delta = a.thisWeek - a.lastWeek;
  const perDay = a.activeDays ? Math.round(a.questions / a.activeDays) : 0;
  return (
    <section className="flex flex-col gap-4" aria-label="Activity">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Activity</h2>
        <p className="text-sm text-muted-foreground">{plural(a.questions, "question")} in the last 3 months</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Current streak" value={plural(a.currentStreak, "day")} sub={a.currentStreak ? "Keep it going today" : "Answer a question to start one"} />
        <Tile label="Longest streak" value={plural(a.longestStreak, "day")} />
        <Tile label="Active days" value={String(a.activeDays)} sub={a.activeDays ? `${perDay} questions on an average one` : undefined} />
        <Tile label="Questions answered" value={a.questions.toLocaleString()} sub={`${plural(a.tests, "test")} finished`} />
        <Tile label="Time practicing" value={duration(a.minutes)} />
        <Tile label="This week" value={a.thisWeek.toLocaleString()} sub={a.lastWeek || a.thisWeek ? `questions · ${delta >= 0 ? "+" : "−"}${Math.abs(delta)} vs last week` : undefined} />
      </div>

      <div className="rounded-xl border bg-card p-3 sm:p-5">
        <div className="flex flex-col gap-2">
          <div className="grid gap-1 pl-6 sm:gap-1.5 sm:pl-8" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {a.weeks.map((_, i) => <span key={i} className="whitespace-nowrap text-xs text-muted-foreground">{i === 0 || month(i) !== month(i - 1) ? month(i) : ""}</span>)}
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <div className="grid w-4 grid-rows-7 gap-1 text-xs text-muted-foreground sm:w-6 sm:gap-1.5">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} translate="no" className="flex items-center">{d}</span>)}
            </div>
            <div className="grid min-w-0 flex-1 grid-flow-col grid-rows-7 gap-1 sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {a.weeks.flat().map((c) => (
                <span key={c.day} title={c.future ? undefined : tip(c)} aria-label={c.future ? undefined : tip(c)}
                  className={`relative flex h-7 items-center justify-center rounded-md sm:h-11 ${c.future ? "invisible" : `${LEVEL[c.level]} ${TEXT[c.level]} hover:ring-2 hover:ring-foreground/40`}`}>
                  <span className="absolute left-1 top-0.5 hidden text-[10px] leading-none opacity-70 sm:block">{Number(c.day.slice(8))}</span>
                  {c.questions > 0 && <span className="hidden text-sm font-medium tabular-nums sm:block">{c.questions}</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
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
