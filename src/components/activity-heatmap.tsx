import type { Activity, Cell } from "@/engine/activity";

const LEVEL = [
  "bg-muted",
  "bg-blue-200 dark:bg-blue-950",
  "bg-blue-300 dark:bg-blue-800",
  "bg-blue-400 dark:bg-blue-600",
  "bg-blue-600 dark:bg-blue-400",
];
const long = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const tip = (c: Cell) => c.questions || c.tests
  ? `${[c.questions && plural(c.questions, "question"), c.tests && plural(c.tests, "test"), c.minutes && `${c.minutes} min`].filter(Boolean).join(" · ")} on ${long(c.day)}`
  : `No activity on ${long(c.day)}`;

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-col"><span className="text-xl font-semibold tabular-nums">{value}</span><span className="text-xs text-muted-foreground">{label}</span></div>;
}

/** GitHub-style grid: a column per week (Monday first), a square per day, darker = more questions answered. */
export function ActivityHeatmap({ activity: a }: { activity: Activity }) {
  const months = a.weeks.map((w, i) => {
    const m = new Date(`${w[0]!.day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    return i === 0 || m !== new Date(`${a.weeks[i - 1]![0]!.day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }) ? m : "";
  });
  return (
    <section className="flex flex-col gap-4" aria-label="Activity">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <h2 className="font-medium">Activity</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <Stat label="Current streak" value={plural(a.currentStreak, "day")} />
          <Stat label="Longest streak" value={plural(a.longestStreak, "day")} />
          <Stat label="Active days" value={String(a.activeDays)} />
          <Stat label="Questions answered" value={a.questions.toLocaleString()} />
          <Stat label="Tests finished" value={String(a.tests)} />
        </div>
      </div>
      <div className="max-w-full overflow-x-auto rounded-xl border bg-card p-4">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-1 pl-8 text-xs text-muted-foreground">
            {months.map((m, i) => <span key={i} className="w-3.5 overflow-visible whitespace-nowrap">{m}</span>)}
          </div>
          <div className="flex gap-1">
            <div className="flex w-7 flex-col gap-1 text-xs text-muted-foreground">
              {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => <span key={i} className="h-3.5 leading-3.5">{d}</span>)}
            </div>
            {a.weeks.map((w) => (
              <div key={w[0]!.day} className="flex flex-col gap-1">
                {w.map((c) => <span key={c.day} title={c.future ? undefined : tip(c)} aria-label={c.future ? undefined : tip(c)} className={`size-3.5 rounded-[3px] ${c.future ? "invisible" : LEVEL[c.level]}`} />)}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            Less {LEVEL.map((l) => <span key={l} className={`size-3.5 rounded-[3px] ${l}`} />)} More
          </div>
        </div>
      </div>
    </section>
  );
}
