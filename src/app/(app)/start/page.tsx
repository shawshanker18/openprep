import { likelyCoveredSkills } from "@/lib/curriculum-coverage";
import Link from "next/link";
import { ChevronRight, Circle, CircleCheck, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandBanner } from "@/components/brand";
import { requireUser } from "@/server/auth";
import { safely } from "@/lib/safely";
import { COURSE_BY_ID } from "@/content/chapter-courses";
import { studentAssignments } from "@/server/course-assignment";
import { GETTING_STARTED, scratchProgress } from "@/server/scratch";

export const metadata = { title: "Start from scratch" };

const isEnglish = (group: string) => group.startsWith("Reading and Writing");
const isGettingStarted = (group: string) => group === GETTING_STARTED;

export default async function StartPage() {
  const { userId, profile } = await requireUser();
  const covered = likelyCoveredSkills(profile);
  const [{ steps, next }, assigned] = await Promise.all([scratchProgress(userId), safely(() => studentAssignments(userId), [])]);
  const done = steps.filter((s) => s.status === "done").length;
  const skipped = steps.filter((s) => s.status === "skipped").length;
  const allGroups = [...new Set(steps.map((s) => s.group))];
  // One page: Maths and English are sections of the same list, so switching between them never reloads anything.
  const mathGroups = allGroups.filter((g) => !isGettingStarted(g) && !isEnglish(g));
  const englishGroups = allGroups.filter((g) => !isGettingStarted(g) && isEnglish(g));
  const orientation = steps.filter((s) => isGettingStarted(s.group));
  const orientationDone = orientation.filter((s) => s.status === "done").length;

  const lessonGroups = (groups: string[]) => (
    <div className="grid items-start gap-3 sm:grid-cols-2">
      {groups.map((g) => (
        <details key={g} name="lesson-groups" open={g === next?.group} className="group min-w-0 overflow-hidden rounded-xl border">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 hover:bg-muted [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{g}</span><span className="text-xs text-muted-foreground">{steps.filter((s) => s.group === g && s.status === "done").length} of {steps.filter((s) => s.group === g).length} done</span></span>
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
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="relative">
        <BrandBanner eyebrow="Learn" title="Start from scratch" description="Short lessons, one topic at a time." />
        <details className="group absolute right-5 top-5 z-20 sm:right-7 sm:top-7">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border bg-background/90 px-3 text-sm font-medium shadow-sm backdrop-blur hover:bg-muted [&::-webkit-details-marker]:hidden">
            Getting started
            <span className="text-xs font-normal text-muted-foreground tabular-nums">{orientationDone} of {orientation.length}</span>
            <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" />
          </summary>
          <ol className="lesson-reveal absolute right-0 top-full z-20 mt-2 w-72 divide-y rounded-xl border bg-background shadow-md">
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

      {assigned.length > 0 && (
        <section aria-label="Your chapter routes" className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
          <p className="text-muted-foreground">Your routes through the Class 11 chapters</p>
          <ul className="flex flex-col gap-1">
            {assigned.map((a) => <li key={a.courseId}><span className="font-medium">{COURSE_BY_ID[a.courseId]?.title ?? a.courseId}</span>: {a.name}</li>)}
          </ul>
        </section>
      )}

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

      <section aria-labelledby="maths-heading" className="lesson-reveal flex flex-col gap-3">
        <h2 id="maths-heading" className="text-sm font-semibold text-muted-foreground">Maths</h2>
        {lessonGroups(mathGroups)}
      </section>

      <section aria-labelledby="english-heading" className="lesson-reveal flex flex-col gap-3">
        <h2 id="english-heading" className="text-sm font-semibold text-muted-foreground">English</h2>
        {lessonGroups(englishGroups)}
      </section>
    </div>
  );
}
