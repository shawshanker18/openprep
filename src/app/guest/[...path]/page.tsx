import Link from "next/link";
import { notFound } from "next/navigation";
import { DOMAINS, SKILLS, SKILL_BY_ID } from "@/content/taxonomy";
import { getLesson, getMasteryLesson, listDesmosLessons } from "@/server/lessons";
import { DesmosCalculator } from "@/components/desmos-panel";
import { LessonLevels } from "@/components/lesson-levels";
import { LessonTextSize } from "@/components/lesson-text-size";
import { LessonWorkspace } from "@/components/lesson-workspace";
import { Markdown } from "@/components/markdown";
import { GuestPractice } from "../guest-practice";
import { GuestReview } from "../review";

// Same section names as the signed-in menu. Anything that needs an account says so and offers Sign in.
const titles: Record<string, string> = {
  dashboard: "Dashboard", analysis: "Analysis", practice: "Adaptive Practice", "question-bank": "Question bank",
  start: "Start from scratch", skills: "Your skills", course: "Course", desmos: "Desmos", tests: "Practice tests",
  mistakes: "Mistakes", bookmarks: "Saved questions", settings: "Settings",
};

export default async function GuestSection({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const section = path[0] ?? "";
  const id = path[1];
  const title = titles[section];
  if (!title || path.length > 2) notFound();

  // A lesson, exactly as a student sees it: the same lesson view, with no progress saved.
  if ((section === "start" || section === "skills") && id) {
    const skill = SKILL_BY_ID[id];
    if (!skill) notFound();
    const lesson = await getLesson(id);
    const mastery = await getMasteryLesson(id);
    return (
      <div className="flex w-full max-w-4xl flex-col gap-6">
        <Link href="/guest/start" className="text-sm text-muted-foreground hover:text-foreground">← Start from scratch</Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{skill.name}</h1>
          {lesson?.minutes && <p className="text-sm text-muted-foreground">About {lesson.minutes} minutes</p>}
        </div>
        {lesson ? (
          <LessonTextSize>
            <LessonLevels skillId={id} foundation={lesson} mastery={mastery} />
          </LessonTextSize>
        ) : <p className="text-muted-foreground">This lesson is not available right now.</p>}
        <Link href="/guest/practice" className="underline">Try questions as a guest</Link>
      </div>
    );
  }

  // A Desmos lesson uses the same two-column workspace as the signed-in site, with the calculator beside the text.
  if (section === "desmos") {
    const lessons = await listDesmosLessons();
    const lesson = id ? lessons.find((l) => l.slug === id) : null;
    if (id && !lesson) notFound();
    if (lesson) {
      return (
        <LessonWorkspace title={lesson.title} slug={lesson.slug} calculator={<DesmosCalculator expressions={lesson.expressions} className="h-[min(calc(100dvh-7.5rem),52rem)] min-h-[26rem]" />}>
          <LessonTextSize>
            <Markdown className="text-[1em] leading-relaxed">{lesson.md}</Markdown>
          </LessonTextSize>
        </LessonWorkspace>
      );
    }
    return (
      <div className="flex w-full max-w-4xl flex-col gap-5">
        <h1 className="text-2xl font-semibold">Desmos on the SAT</h1>
        <p className="text-sm text-muted-foreground">Graph equations, find intersections, and use tables and regression.</p>
        <ol className="flex flex-col gap-2">
          {lessons.map((l, i) => (
            <li key={l.slug}><Link href={`/guest/desmos/${l.slug}`} className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted"><span>{i + 1}. {l.title}</span></Link></li>
          ))}
        </ol>
      </div>
    );
  }

  if (id) notFound();

  return (
    <div className="flex w-full max-w-4xl flex-col gap-5">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {section === "practice" || section === "question-bank" ? <GuestPractice /> :
        section === "start" || section === "skills" || section === "course" ? (
          <div className="grid items-start gap-3 sm:grid-cols-2">
            {Object.entries(DOMAINS).sort((a, b) => Number(b[1].section === "math") - Number(a[1].section === "math")).map(([domain, d]) => (
              <details key={domain} name={d.section === "math" ? "guest-math" : "guest-rw"} className="min-w-0 rounded-xl border p-4">
                <summary className="cursor-pointer font-medium">{d.section === "math" ? "Math" : "Reading and Writing"} · {d.name}<span className="ml-2 text-xs font-normal text-muted-foreground">{SKILLS.filter((s) => s.domain === domain).length} topics</span></summary>
                <ul className="mt-3 flex flex-col gap-3">{SKILLS.filter((s) => s.domain === domain).map((s) => <li key={s.id}><Link href={`/guest/start/${s.id}`} className="underline">{s.name}</Link></li>)}</ul>
              </details>
            ))}
          </div>
        ) :
        section === "mistakes" ? <GuestReview mistakesOnly /> :
        section === "tests" ? (
          <>
            <p>Timed tests use separate Math and Reading and Writing modules. Your answers determine the difficulty of the second module.</p>
            <div className="grid gap-4 sm:grid-cols-2">{[["Full SAT", "Four modules · 2 hours 14 minutes"], ["Short practice test", "Two modules in one subject · 64–70 minutes"]].map(([name, detail]) => <section key={name} className="rounded-xl border p-5"><h2 className="font-semibold">{name}</h2><p className="my-3 text-sm">{detail}</p><Link href="/login" className="underline">Continue to start</Link></section>)}</div>
          </>
        ) :
        section === "settings" ? <p>Guest answers are stored only in this browser. Sign in to save progress across devices and set your study schedule.</p> :
        section === "bookmarks" ? <p>Save questions to revisit them later with an account.</p> :
        section === "analysis" ? <p>Analysis shows your accuracy, pacing and mistakes once you have answered questions in an account.</p> :
        section === "dashboard" ? <p>Your home page shows what to do next once you have an account.</p> :
        <Link href="/guest/start" className="underline">Choose a lesson</Link>}
      {!["practice", "question-bank", "start", "skills", "course", "desmos"].includes(section) && (
        <p className="text-sm text-muted-foreground"><Link href="/login" className="underline">Sign in</Link> to save your progress and use the full question bank and tests.</p>
      )}
    </div>
  );
}
