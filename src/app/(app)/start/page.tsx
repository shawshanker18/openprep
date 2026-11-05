import { likelyCoveredSkills } from "@/lib/curriculum-coverage";
import Link from "next/link";
import { ChevronRight, Circle, CircleCheck, SkipForward, Flame, Trophy, CheckCircle2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandBanner } from "@/components/brand";
import { requireUser } from "@/server/auth";
import { getSkillSummary } from "@/server/analytics";
import { safely } from "@/lib/safely";
import { studentAssignments } from "@/server/course-assignment";
import { GETTING_STARTED, scratchProgress } from "@/server/scratch";
import { getActivity } from "@/server/activity";

export const metadata = { title: "Start from scratch" };

const isEnglish = (group: string) => group.startsWith("Reading and Writing");
const isGettingStarted = (group: string) => group === GETTING_STARTED;

export default async function StartPage() {
  const { userId, profile } = await requireUser();
  const covered = likelyCoveredSkills(profile);
  const [{ steps, next }, assigned, { skills: summaries }, activity] = await Promise.all([
    scratchProgress(userId),
    safely(() => studentAssignments(userId), []),
    getSkillSummary(userId),
    safely(() => getActivity(userId, profile.timezone, 2), null),
  ]);

  const summaryBySkill = new Map(summaries.map((s) => [s.id, s]));
  const done = steps.filter((s) => s.status === "done").length;
  const skipped = steps.filter((s) => s.status === "skipped").length;
  const remaining = Math.max(0, steps.length - done);
  const completionPct = Math.round((done / Math.max(1, steps.length)) * 100);

  const allGroups = [...new Set(steps.map((s) => s.group))];
  const mathGroups = allGroups.filter((g) => !isGettingStarted(g) && !isEnglish(g));
  const englishGroups = allGroups.filter((g) => !isGettingStarted(g) && isEnglish(g));
  const orientation = steps.filter((s) => isGettingStarted(s.group));
  const orientationDone = orientation.filter((s) => s.status === "done").length;

  const currentStreak = activity?.currentStreak ?? 0;
  // Get days for the current week for streak display
  const currentWeekCells = activity?.weeks?.at(-1) ?? [];
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

  const renderGroupList = (groups: string[]) => (
    <div className="grid items-start gap-4 sm:grid-cols-2">
      {groups.map((g) => {
        const groupSteps = steps.filter((s) => s.group === g);
        const groupDone = groupSteps.filter((s) => s.status === "done").length;
        const isComplete = groupDone === groupSteps.length && groupSteps.length > 0;
        const pct = Math.round((groupDone / Math.max(1, groupSteps.length)) * 100);

        return (
          <details
            key={g}
            name="lesson-groups"
            open={g === next?.group}
            className="group min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition-all hover:border-foreground/30 hover:shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3.5 p-4.5 hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="block text-sm font-semibold tracking-tight text-foreground truncate">{g}</span>
                  {isComplete ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <CheckCircle2 className="size-3" /> Done
                    </span>
                  ) : (
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {groupDone} of {groupSteps.length} done
                    </span>
                  )}
                </div>

                {/* Mini progress bar for group */}
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-md bg-muted">
                  <div
                    className={`h-full rounded-md transition-all ${isComplete ? "bg-primary" : "bg-primary/70"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
            </summary>

            <ol className="lesson-reveal flex flex-col divide-y divide-border/60 border-t border-border/60 bg-muted/15">
              {groupSteps.map((s, idx) => {
                const sum = s.kind === "skill" ? summaryBySkill.get(s.ref) : undefined;
                const isNext = s.key === next?.key;

                return (
                  <li key={s.key}>
                    <Link
                      href={`/start/${s.key}`}
                      aria-current={isNext ? "step" : undefined}
                      className="flex items-center gap-3.5 px-4.5 py-3 text-sm transition-colors hover:bg-muted/60 aria-[current=step]:bg-muted/80 aria-[current=step]:font-medium"
                    >
                      <span className="text-xs font-mono font-medium text-muted-foreground w-4 text-center">
                        {idx + 1}
                      </span>

                      {s.status === "done" ? (
                        <CircleCheck className="size-4 shrink-0 text-primary" aria-label="Done" />
                      ) : s.status === "skipped" ? (
                        <SkipForward className="size-4 shrink-0 text-muted-foreground" aria-label="Skipped" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground/60" aria-label="Not done" />
                      )}

                      <span className={`flex-1 truncate ${s.status === "skipped" ? "text-muted-foreground" : "text-foreground"}`}>
                        {s.title}
                        {covered.has(s.ref) && (
                          <span className="ml-2 inline-block rounded-md bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900">
                            Likely in school
                          </span>
                        )}
                      </span>

                      {isNext && (
                        <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          Next
                        </span>
                      )}

                      {sum && sum.status !== "unknown" && (
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {sum.mastery}%
                        </span>
                      )}

                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </details>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Banner */}
      <div className="relative">
        <BrandBanner eyebrow="Learn" title="Start from scratch" description="Short lessons, one topic at a time." />
        <details className="group absolute right-5 top-5 z-20 sm:right-7 sm:top-7">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-border/80 bg-background/90 px-3.5 text-xs font-semibold shadow-xs backdrop-blur hover:bg-muted [&::-webkit-details-marker]:hidden">
            Getting started
            <span className="text-xs font-normal text-muted-foreground tabular-nums">
              {orientationDone} of {orientation.length}
            </span>
            <ChevronRight className="size-3.5 shrink-0 transition-transform group-open:rotate-90" />
          </summary>
          <ol className="lesson-reveal absolute right-0 top-full z-20 mt-2 w-72 divide-y rounded-2xl border border-border/80 bg-background p-1.5 shadow-lg">
            {orientation.map((s) => (
              <li key={s.key}>
                <Link href={`/start/${s.key}`} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium hover:bg-muted">
                  {s.status === "done" ? <CircleCheck className="size-4 shrink-0 text-primary" aria-label="Done" /> : <Circle className="size-4 shrink-0 text-muted-foreground" aria-label="Not done" />}
                  {s.title}
                </Link>
              </li>
            ))}
          </ol>
        </details>
      </div>

      {profile.curriculum === "cbse" && (
        <Link href="/cbse-math" className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm hover:bg-muted/40 transition-colors">
          <span>New to SAT maths after CBSE? <span className="font-semibold underline">Read how the maths test works first.</span></span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      )}

      {assigned.length > 0 && (
        <section aria-label="Your chapter routes" className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your routes through the Class 11 chapters</p>
          <ul className="flex flex-col gap-1.5 mt-1">
            {assigned.map((a) => (
              <li key={a.courseId} className="text-foreground">
                <span className="font-semibold">{a.courseTitle ?? a.courseId}</span>: {a.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Khan Academy Style Course Progress with subtle, rectangular streak indicator */}
      <section className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course Progress</span>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {completionPct}% Complete
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold tracking-tight text-foreground tabular-nums">{done}</span>
              <span className="text-sm font-medium text-muted-foreground">courses done ·</span>
              <span className="text-sm font-medium text-foreground tabular-nums">{remaining}</span>
              <span className="text-sm font-medium text-muted-foreground">remaining</span>
            </div>
          </div>

          {/* Small, rectangular streak badge with aligned bars */}
          <div className="inline-flex items-center gap-2.5 rounded-lg border border-border/70 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground self-start sm:self-auto shadow-2xs">
            <Flame className="size-3.5 text-foreground/70" />
            <span className="font-medium text-foreground tabular-nums">{currentStreak} day streak</span>
            <div className="flex items-center gap-1 ml-1 border-l border-border/60 pl-2">
              {weekDays.map((d, i) => {
                const cell = currentWeekCells[i];
                const isActive = cell && (cell.questions > 0 || cell.tests > 0);
                return (
                  <span
                    key={i}
                    title={`${d}: ${isActive ? "Active" : "Rest"}`}
                    className={`h-2.5 w-1.5 rounded-xs transition-colors ${
                      isActive ? "bg-foreground" : "bg-muted-foreground/25"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Master Progress Bar */}
        <div className="flex flex-col gap-1">
          <div className="h-2 w-full overflow-hidden rounded-md bg-muted">
            <div
              className="h-full rounded-md bg-primary transition-all duration-300"
              style={{ width: `${Math.max(2, completionPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
            <span>0</span>
            <span>21 halfway</span>
            <span>42 target</span>
          </div>
        </div>

        {/* Up Next in Path */}
        {next ? (
          <div className="flex flex-col gap-2.5 rounded-lg border border-border/50 bg-muted/20 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {done + skipped === 0 ? "Start here" : "Up next in your path"}
              </p>
              <p className="text-sm font-bold text-foreground truncate mt-0.5">{next.title}</p>
              <p className="text-xs text-muted-foreground">{next.group}</p>
            </div>
            <Button size="sm" className="h-9 rounded-lg px-5 font-medium shrink-0" render={<Link href={`/start/${next.key}`} />}>
              {done + skipped === 0 ? "Start" : "Continue"} <ChevronRight className="ml-1 size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/20 p-3">
            <Trophy className="size-4 text-primary" />
            <p className="text-xs font-medium">
              All topics covered! <Link href="/tests" className="underline font-semibold">Take a practice test</Link>.
            </p>
          </div>
        )}
      </section>

      {/* Topics List with High Visibility */}
      <section aria-labelledby="maths-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <h2 id="maths-heading" className="text-base font-bold tracking-tight text-foreground">
            Maths Curriculum
          </h2>
          <span className="text-xs font-semibold text-muted-foreground">
            {mathGroups.length} core units
          </span>
        </div>
        {renderGroupList(mathGroups)}
      </section>

      <section aria-labelledby="english-heading" className="flex flex-col gap-3 mt-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <h2 id="english-heading" className="text-base font-bold tracking-tight text-foreground">
            Reading & Writing Curriculum
          </h2>
          <span className="text-xs font-semibold text-muted-foreground">
            {englishGroups.length} core units
          </span>
        </div>
        {renderGroupList(englishGroups)}
      </section>
    </div>
  );
}
