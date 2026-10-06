import { likelyCoveredSkills } from "@/lib/curriculum-coverage";
import Link from "next/link";
import { ChevronRight, Circle, CircleCheck, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { scratchProgress } from "@/server/scratch";

export const metadata = { title: "Start from scratch" };

export default async function StartPage() {
  const { userId, profile } = await requireUser();
  const covered=likelyCoveredSkills(profile);
  const { steps, next } = await scratchProgress(userId);
  const done = steps.filter((s) => s.status === "done").length;
  const skipped = steps.filter((s) => s.status === "skipped").length;
  const groups = [...new Set(steps.map((s) => s.group))];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Start from scratch</h1>
        <p className="text-sm text-muted-foreground">
          SAT format, calculator basics, and Math and Reading and Writing lessons. Work through the topics in order,
          or skip topics you already know.
        </p>
        <p className="text-xs text-muted-foreground">“Likely covered in school” is a guide based on your grade and curriculum. Every topic stays available to learn.</p>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border p-5">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium">{done} of {steps.length} topics done</span>
          {skipped > 0 && <span className="text-muted-foreground">{skipped} skipped</span>}
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
            You have been through every topic{skipped ? `, skipping ${skipped}` : ""}. Open any topic below to read it again, or take a practice test on the{" "}
            <Link href="/tests" className="underline">Tests page</Link>.
          </p>
        )}
      </section>

      {groups.map((g) => (
        <section key={g} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">{g}</h2>
          <ol className="flex flex-col divide-y rounded-xl border">
            {steps.filter((s) => s.group === g).map((s) => (
              <li key={s.key}>
                <Link href={`/start/${s.key}`} aria-current={s.key === next?.key ? "step" : undefined}
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted aria-[current=step]:bg-muted">
                  {s.status === "done" ? <CircleCheck className="size-4 shrink-0 text-primary" aria-label="Done" />
                    : s.status === "skipped" ? <SkipForward className="size-4 shrink-0 text-muted-foreground" aria-label="Skipped" />
                    : <Circle className="size-4 shrink-0 text-muted-foreground" aria-label="Not done" />}
                  <span className={`flex-1 ${s.status === "skipped" ? "text-muted-foreground" : ""}`}>{s.title}{covered.has(s.ref) && <span className="ml-2 inline-block rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Likely covered in school</span>}</span>
                  {s.status === "skipped" && <span className="text-xs text-muted-foreground">Skipped</span>}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
