import { likelyCoveredSkills } from "@/lib/curriculum-coverage";
import Link from "next/link";
import { ChevronRight, Circle, CircleCheck, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandBanner } from "@/components/brand";
import { requireUser } from "@/server/auth";
import { scratchProgress } from "@/server/scratch";

export const metadata = { title: "Start from scratch" };

const isEnglish = (group: string) => group.startsWith("Reading and Writing");

export default async function StartPage({ searchParams }: PageProps<"/start">) {
  const sp = await searchParams;
  const { userId, profile } = await requireUser();
  const covered=likelyCoveredSkills(profile);
  const { steps, next } = await scratchProgress(userId);
  const done = steps.filter((s) => s.status === "done").length;
  const skipped = steps.filter((s) => s.status === "skipped").length;
  const allGroups = [...new Set(steps.map((s) => s.group))];
  // Two tabs: English (Reading and Writing) and Maths (SAT basics, Desmos and the Math skills). Opens on the tab that has the next lesson.
  const tab: "english" | "math" = sp.tab === "english" ? "english" : sp.tab === "math" ? "math" : next && isEnglish(next.group) ? "english" : "math";
  const groups = allGroups.filter((g) => isEnglish(g) === (tab === "english"));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <BrandBanner eyebrow="Learn" title="Start from scratch" description="Short lessons, one topic at a time." />

      <nav aria-label="Subject" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
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
          <ol className="flex flex-col divide-y border-t">
            {steps.filter((s) => s.group === g).map((s) => (
              <li key={s.key}>
                <Link href={`/start/${s.key}`} aria-current={s.key === next?.key ? "step" : undefined}
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted aria-[current=step]:bg-muted">
                  {s.status === "done" ? <CircleCheck className="size-4 shrink-0 text-primary" aria-label="Done" />
                    : s.status === "skipped" ? <SkipForward className="size-4 shrink-0 text-muted-foreground" aria-label="Skipped" />
                    : <Circle className="size-4 shrink-0 text-muted-foreground" aria-label="Not done" />}
                  <span className={`flex-1 ${s.status === "skipped" ? "text-muted-foreground" : ""}`}>{s.title}{covered.has(s.ref) && <span className="ml-2 inline-block rounded bg-neutral-50 px-2 py-0.5 text-xs text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">Likely covered in school</span>}</span>
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
