import { likelyCoveredSkills } from "@/lib/curriculum-coverage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DesmosCalculator } from "@/components/desmos-panel";
import { LessonStudyView } from "@/components/lesson-study-view";
import { Markdown } from "@/components/markdown";
import { ABOUT_SAT_MD } from "@/content/about-sat";
import { requireUser } from "@/server/auth";
import { getLesson, listDesmosLessons } from "@/server/lessons";
import { scratchPath, scratchProgress } from "@/server/scratch";
import { stepAction } from "../actions";

export async function generateMetadata({ params }: PageProps<"/start/[step]">) {
  const { step } = await params;
  return { title: (await scratchPath()).find((s) => s.key === step)?.title ?? "Start from scratch" };
}

export default async function StepPage({ params }: PageProps<"/start/[step]">) {
  const { step: key } = await params;
  const { userId, profile } = await requireUser();
  const { steps } = await scratchProgress(userId);
  const i = steps.findIndex((s) => s.key === key);
  if (i < 0) notFound();
  const step = steps[i]!;
  const prev = steps[i - 1], following = steps[i + 1];
  const [lesson, desmos] = await Promise.all([
    step.kind === "skill" ? getLesson(step.ref) : null,
    step.kind === "desmos" ? listDesmosLessons().then((all) => all.find((l) => l.slug === step.ref) ?? null) : null,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/start" className="text-sm text-muted-foreground hover:text-foreground">← Start from scratch</Link>
        <p className="text-sm text-muted-foreground">Step {i + 1} of {steps.length} · {step.group}</p>
        <h1 className="text-2xl font-semibold">{step.title}</h1>
        {likelyCoveredSkills(profile).has(step.ref) && <p className="text-sm text-neutral-700 dark:text-neutral-300">Likely covered in school. You can still study the full lesson and practice here.</p>}
        {step.status === "done" && <p className="text-sm text-muted-foreground">✓ You finished this topic</p>}
        {step.status === "skipped" && <p className="text-sm text-muted-foreground">You skipped this topic. Read it now and press Done to count it.</p>}
      </div>

      {step.kind === "intro" && <article className="max-w-2xl"><Markdown>{ABOUT_SAT_MD}</Markdown></article>}

      {step.kind === "desmos" && (desmos ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Markdown className="text-[15px]">{desmos.md}</Markdown>
          <DesmosCalculator expressions={desmos.expressions} className="h-[28rem]" />
        </div>
      ) : <p className="text-muted-foreground">This lesson is coming soon.</p>)}

      {step.kind === "skill" && (lesson ? (
        <article className="flex max-w-3xl flex-col gap-6">
          {lesson.minutes && <p className="text-sm text-muted-foreground">About {lesson.minutes} minutes</p>}
          <LessonStudyView sections={lesson.sections} skillId={step.ref} curriculum={profile.curriculum} grade={profile.grade} subjects={profile.subjects} />
          <section className="flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Try it yourself</p>
              <p className="text-sm text-muted-foreground">Five introductory SAT practice questions. Start with the lower SAT difficulty, then build up in Recommended Practice.</p>
            </div>
            <Button variant="outline" render={<Link href={`/practice?mode=set&skills=${step.ref}&difficulty=1&count=5&from=/start/${step.key}`} />}>Practice 5 questions</Button>
          </section>
        </article>
      ) : <p className="text-muted-foreground">The lesson for this topic is coming soon.</p>)}

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-background p-3 lg:bottom-4">
        <form action={stepAction.bind(null, step.key, "done")}><Button type="submit">{step.status === "done" ? "Next topic" : "Done, next topic"}</Button></form>
        {step.status !== "done" && <form action={stepAction.bind(null, step.key, "skip")}><Button type="submit" variant="outline">Skip this topic</Button></form>}
        <span className="ml-auto flex gap-1">
          {prev && <Button variant="ghost" size="sm" render={<Link href={`/start/${prev.key}`} aria-label={`Previous: ${prev.title}`} />}><ChevronLeft className="size-4" />Back</Button>}
          {following && <Button variant="ghost" size="sm" render={<Link href={`/start/${following.key}`} aria-label={`Next: ${following.title}`} />}>Next<ChevronRight className="size-4" /></Button>}
        </span>
      </div>
    </div>
  );
}
