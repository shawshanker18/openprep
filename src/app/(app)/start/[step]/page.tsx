import { likelyCoveredSkills } from "@/lib/curriculum-coverage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DesmosCalculator } from "@/components/desmos-panel";
import { LessonStudyView } from "@/components/lesson-study-view";
import { LessonTextSize } from "@/components/lesson-text-size";
import { Markdown } from "@/components/markdown";
import { orientationBy } from "@/content/getting-started";
import { requireUser } from "@/server/auth";
import { conceptsForSkill } from "@/server/concepts";
import { getStudentLesson } from "@/server/course-lessons";
import { safely } from "@/lib/safely";
import { getLesson, listDesmosLessons } from "@/server/lessons";
import { scratchPath, scratchProgress } from "@/server/scratch";
import { checkpointAction, conceptPracticeAction, stepAction } from "../actions";

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
  const [lesson, desmos, concepts] = await Promise.all([
    step.kind === "skill" ? safely(() => getStudentLesson(userId, step.ref), null).then((own) => own ?? getLesson(step.ref)) : null,
    step.kind === "desmos" ? listDesmosLessons().then((all) => all.find((l) => l.slug === step.ref) ?? null) : null,
    step.kind === "skill" ? safely(() => conceptsForSkill(step.ref), []) : [],
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

      {step.kind === "intro" && <article className="max-w-2xl"><Markdown>{orientationBy(step.key)?.md ?? ""}</Markdown></article>}

      {step.kind === "desmos" && (desmos ? (
        <LessonTextSize>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <Markdown className="text-[1em] leading-relaxed">{desmos.md}</Markdown>
            <div className="lg:sticky lg:top-4">
              <DesmosCalculator expressions={desmos.expressions} className="h-[min(78dvh,52rem)] min-h-[26rem]" />
            </div>
          </div>
        </LessonTextSize>
      ) : <p className="text-muted-foreground">This lesson is not available right now. Please pick another step.</p>)}

      {step.kind === "skill" && (lesson ? (
        <LessonTextSize>
          <article className="flex max-w-3xl flex-col gap-6">
            {lesson.minutes && <p className="text-sm text-muted-foreground">About {lesson.minutes} minutes</p>}
            <LessonStudyView sections={lesson.sections} skillId={step.ref} curriculum={profile.curriculum} grade={profile.grade} subjects={profile.subjects} />
            {concepts.length > 0 && (step.status === "done" ? (
              <section aria-labelledby="concepts" className="flex flex-col gap-4">
                <h2 id="concepts" className="text-xl font-semibold">Concepts in this skill</h2>
                <p className="text-sm text-muted-foreground">Each concept has its own explanation and questions.</p>
                {concepts.map((c, i) => (
                  <details key={c.id} className="group min-w-0 overflow-hidden rounded-xl border">
                    <summary className="flex cursor-pointer list-none items-center gap-3 p-4 hover:bg-muted [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1 text-sm font-semibold">Concept {i + 1}: {c.title}</span>
                      <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="flex flex-col gap-3 border-t p-4">
                      {c.explanationMd && <Markdown className="text-[1em] leading-relaxed">{c.explanationMd}</Markdown>}
                      <form action={conceptPracticeAction.bind(null, step.key, c.id)}>
                        <Button type="submit" variant="outline" disabled={c.questionCount === 0}>
                          {c.questionCount ? `Practise this concept (${c.questionCount} question${c.questionCount === 1 ? "" : "s"})` : "No questions yet"}
                        </Button>
                      </form>
                    </div>
                  </details>
                ))}
              </section>
            ) : (
              <p className="text-sm text-muted-foreground">Finish this topic to unlock its {concepts.length} concept{concepts.length === 1 ? "" : "s"}.</p>
            ))}
          </article>
        </LessonTextSize>
      ) : <p className="text-muted-foreground">This lesson is not available right now. Please pick another topic.</p>)}

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-background p-3 lg:bottom-4">
        <form action={stepAction.bind(null, step.key, "done")}><Button type="submit">{step.status === "done" ? "Next topic" : "Done, next topic"}</Button></form>
        {step.status !== "done" && <form action={stepAction.bind(null, step.key, "skip")}><Button type="submit" variant="outline">Skip this topic</Button></form>}
        <span className="ml-auto flex flex-wrap items-center gap-1">
          {step.kind === "skill" && lesson && <form action={checkpointAction.bind(null, step.key)}><Button type="submit" variant="outline" size="sm">Checkpoint: 5 questions</Button></form>}
          {prev && <Button variant="ghost" size="sm" render={<Link href={`/start/${prev.key}`} aria-label={`Previous: ${prev.title}`} />}><ChevronLeft className="size-4" />Back</Button>}
          {following && <Button variant="ghost" size="sm" render={<Link href={`/start/${following.key}`} aria-label={`Next: ${following.title}`} />}>Next<ChevronRight className="size-4" /></Button>}
        </span>
      </div>
    </div>
  );
}
