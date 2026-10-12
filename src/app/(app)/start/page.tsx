import { likelyCoveredSkills } from "@/lib/curriculum-coverage";
import Link from "next/link";
import { ChevronRight, Circle, CircleCheck, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandBanner } from "@/components/brand";
import { requireUser } from "@/server/auth";
import { safely } from "@/lib/safely";
import { studentAssignment } from "@/server/course-assignment";
import { GETTING_STARTED, scratchProgress } from "@/server/scratch";

export const metadata = { title: "Start from scratch" };

const isEnglish = (group: string) => group.startsWith("Reading and Writing");
const isGettingStarted = (group: string) => group === GETTING_STARTED;
type Tab = "math" | "english";

export default async function StartPage({ searchParams }: PageProps<"/start">) {
  const sp = await searchParams;
  const { userId, profile } = await requireUser();
  const covered=likelyCoveredSkills(profile);
  const [{ steps, next }, assigned] = await Promise.all([scratchProgress(userId), safely(() => studentAssignment(userId), null)]);
  const done = steps.filter((s) => s.status === "done").length;
  const skipped = steps.filter((s) => s.status === "skipped").length;
  const allGroups = [...new Set(steps.map((s) => s.group))];
  // Two tabs: Maths (Desmos and the Math skills) and English (Reading and Writing). Getting started sits in its own menu.
  const tabOf = (group: string): Tab => isEnglish(group) ? "english" : "math";
  const requested = (["math", "english"] as const).find((t) => t === sp.tab);
  const tab: Tab = requested ?? (next && !isGettingStarted(next.group) && isEnglish(next.group) ? "english" : "math");
  const groups = allGroups.filter((g) => !isGettingStarted(g) && tabOf(g) === tab);
  const orientation = steps.filter((s) => isGettingStarted(s.group));
  const orientationDone = orientation.filter((s) => s.status === "done").length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <BrandBanner eyebrow="Learn" title="Start from scratch" description="Short lessons, one topic at a time." />

      {assigned && (
        <section aria-label="Your course version" className="rounded-xl border p-4 text-sm">
          <p className="text-muted-foreground">Your course version</p>
          <p className="font-medium">{assigned.name}</p>
          {assigned.reason && <p className="mt-1 text-muted-foreground">{assigned.reason}</p>}
        </section>
      )}

      <div className="flex justify-end">
        <details className="group relative">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted [&::-webkit-details-marker]:hidden">
            Getting started
            <span className="text-xs font-normal text-muted-foreground tabular-nums">{orientationDone} of {orientation.length}</span>
            <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" />
          </summary>
          <ol className="lesson-reveal absolute right-0 z-10 mt-2 w-72 divide-y rounded-xl border bg-background shadow-sm">
            {orientation.map((s) => (
              <li key={s.key}>
                <Link href={`/start/${s.key}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted">
                  {s.status === "done" ? <CircleCheck className="size-4 shrink-0 text-primary" aria-label="Done" /> : <Circle className="size-4 shrink-0 text-muted-foreground" aria-label="Not done" />}
                  {s.title}
                </Link>
              </li>
            ))}
          </ol>
        </details>
      </div>

      <nav aria-label="Section" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {([["math", "Maths"], ["english", "English"]] as const).map(([key, label]) => (
          <Link key={key} href={`/start?tab=${key}`} replace scroll={false} aria-current={tab === key ? "page" : undefined}
            className="flex min-h-11 items-center justify-center rounded-lg text-sm font-medium text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm">{label}</Link>
        ))}
      </nav>

      <section className="flex flex-col gap-3 rounded-xl border p-5">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium">{done} of {steps.length} done</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={steps.length} aria-label="Topics done">
          <div className="h-full bg-primary" style={{ width: `${(100 * done) / steps.length}%` }} />
        </div>
        {next ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{done + skipped === 0 ? "Start here" : "Up next"}</p>
              <p className="font-medium">{next.title}</p>
            </div>
            <Button render={<Link href={`/start/${next.key}`} />}>{done + skipped === 0 ? "Start" : "Continue"}</Button>
          </div>
        ) : (
          <p className="text-sm">
            All topics covered. Open any one to read it again, or <Link href="/tests" className="underline">take a practice test</Link>.
          </p>
        )}
      </section>

      <div className="grid items-start gap-3 sm:grid-cols-2">
      {groups.map((g) => (
        <details key={g} name="lesson-groups" open={g === next?.group} className="group min-w-0 overflow-hidden rounded-xl border">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 hover:bg-muted [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{g}</span><span className="text-xs text-muted-foreground">{steps.filter(s=>s.group===g&&s.status==="done").length} of {steps.filter(s=>s.group===g).length} done</span></span>
            <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" />
          </summary>
          <ol className="lesson-reveal flex flex-col divide-y border-t">
            {steps.filter((s) => s.group === g).map((s) => (
              <li key={s.key}>
                <Link href={`/start/${s.key}`} aria-current={s.key === next?.key ? "step" : undefined}
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted aria-[current=step]:bg-muted">
                  {s.status === "done" ? <CircleCheck className="size-4 shrink-0 text-primary" aria-label="Done" />
                    : s.status === "skipped" ? <SkipForward className="size-4 shrink-0 text-muted-foreground" aria-label="Skipped" />
                    : <Circle className="size-4 shrink-0 text-muted-foreground" aria-label="Not done" />}
                  <span className={`flex-1 ${s.status === "skipped" ? "text-muted-foreground" : ""}`}>{s.title}{covered.has(s.ref) && <span className="ml-2 inline-block rounded bg-black px-2 py-0.5 text-xs text-white">Likely covered in school</span>}</span>
                  {s.status === "skipped" && <span className="text-xs text-muted-foreground">Skipped</span>}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ol>
        </details>
      ))}
      </div>
    </div>
  );
}
