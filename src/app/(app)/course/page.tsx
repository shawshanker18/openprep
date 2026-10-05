import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiagnosticSuggestion } from "@/components/diagnostic-gate";
import { CourseCheckForm, LevelBox, LevelLegend, PointsBar } from "@/components/course-ui";
import { DOMAINS, SKILLS, skillsIn, type Section } from "@/content/taxonomy";
import { checkCount, LEVELS, points, unitSteps, unitsOf } from "@/engine/course";
import { diagnosticPending, requireUser } from "@/server/auth";
import { getCourseLevels } from "@/server/course";

export const metadata = { title: "SAT course" };

const SECTIONS: { id: Section; label: string }[] = [{ id: "math", label: "Math" }, { id: "rw", label: "Reading and Writing" }];

export default async function CoursePage({ searchParams }: PageProps<"/course">) {
  const sp = await searchParams;
  const section: Section = sp.section === "rw" ? "rw" : "math";
  const { userId, profile } = await requireUser();
  const levels = await getCourseLevels(userId);
  const skills = SKILLS.filter((s) => s.section === section);
  const total = points(skills.map((s) => levels[s.id]!.level));
  const counts = Object.fromEntries(LEVELS.map((l) => [l.id, skills.filter((s) => levels[s.id]!.level === l.id).length]));
  const units = unitsOf(section);
  const next = units.flatMap((d) => skillsIn(d)).find((s) => !["proficient", "mastered"].includes(levels[s.id]!.level));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">SAT course</p>
        <h1 className="text-2xl font-semibold">{section === "math" ? "SAT Math" : "SAT Reading and Writing"}</h1>
        <p className="text-sm text-muted-foreground">{skills.length} skills · learn each one, practice it, then check yourself with quizzes and unit tests.</p>
      </div>

      <nav className="flex gap-1 rounded-lg border p-1 text-sm sm:self-start" aria-label="Course section">
        {SECTIONS.map((s) => (
          <Link key={s.id} href={`/course?section=${s.id}`} aria-current={s.id === section ? "page" : undefined}
            className="flex-1 rounded-md px-3 py-1.5 text-center hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium sm:flex-none">{s.label}</Link>
        ))}
      </nav>

      {diagnosticPending(profile) && <DiagnosticSuggestion />}

      <section className="flex flex-col gap-3 rounded-xl border p-5">
        <PointsBar {...total} />
        <LevelLegend />
        <p className="text-xs text-muted-foreground">
          {LEVELS.filter((l) => counts[l.id]).map((l) => `${counts[l.id]} ${l.label.toLowerCase()}`).join(" · ")}
        </p>
      </section>

      {next && (
        <section className="flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Up next for you</p>
            <p className="font-medium">{next.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" render={<Link href={`/skills/${next.id}?tab=learn`} />}>Learn</Button>
            <Button size="sm" render={<Link href={`/practice?mode=set&skills=${next.id}&count=5&from=/course/${next.domain}`} />}>Practice</Button>
          </div>
        </section>
      )}

      <ol className="flex flex-col gap-3">
        <li>
          <Link href="/course/about-the-sat" className="flex items-center justify-between gap-3 rounded-xl border p-5 hover:bg-muted">
            <span className="flex items-center gap-3">
              <BookOpen className="size-5 text-muted-foreground" />
              <span><span className="block text-sm text-muted-foreground">Unit 1</span><span className="font-medium">About the SAT</span></span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
        {units.map((d, i) => {
          const steps = unitSteps(d);
          const unitPoints = points(skillsIn(d).map((s) => levels[s.id]!.level));
          return (
            <li key={d}>
              <Link href={`/course/${d}`} className="flex flex-col gap-3 rounded-xl border p-5 hover:bg-muted">
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm text-muted-foreground">Unit {i + 2} · {skillsIn(d).length} skills</span>
                    <span className="font-medium">{DOMAINS[d].name}</span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{unitPoints.max ? Math.round((100 * unitPoints.earned) / unitPoints.max) : 0}%</span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5" aria-label="Skill levels in this unit">
                  {steps.map((s, j) => s.kind === "skill"
                    ? <LevelBox key={j} level={levels[s.skill.id]!.level} title={`${s.skill.name}: ${levels[s.skill.id]!.level.replace("-", " ")}`} />
                    : <span key={j} title={s.kind === "quiz" ? `Quiz ${s.n}` : "Unit test"}
                        className={`inline-flex shrink-0 items-center justify-center rounded-full border text-[9px] font-medium text-muted-foreground ${s.kind === "quiz" ? "size-4" : "size-5"}`}>
                        {s.kind === "quiz" ? "Q" : "T"}
                      </span>)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <section className="flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Course challenge</p>
          <p className="font-medium">Test yourself on every {section === "math" ? "Math" : "Reading and Writing"} skill</p>
          <p className="text-sm text-muted-foreground">{checkCount("challenge", skills.length)} questions, untimed. Your results update every skill&apos;s level.</p>
        </div>
        <CourseCheckForm variant="default" label="Start course challenge" title={`${section === "math" ? "SAT Math" : "SAT Reading and Writing"}: course challenge`}
          skillIds={skills.map((s) => s.id)} count={checkCount("challenge", skills.length)} />
      </section>
    </div>
  );
}
