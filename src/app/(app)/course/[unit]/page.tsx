import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseCheckForm, LevelBox, LevelLegend, PointsBar } from "@/components/course-ui";
import { DOMAINS, skillsIn, type DomainId } from "@/content/taxonomy";
import { checkCount, LEVEL_BY_ID, points, unitSteps, unitsOf } from "@/engine/course";
import { requireUser } from "@/server/auth";
import { getCourseLevels } from "@/server/course";

const isUnit = (u: string): u is DomainId => Object.hasOwn(DOMAINS, u);

export async function generateMetadata({ params }: PageProps<"/course/[unit]">) {
  const { unit } = await params;
  return { title: isUnit(unit) ? DOMAINS[unit].name : "Course" };
}

// Lesson sections the course links to directly (ids come from the lesson headings).
const LEARN = [
  { label: "Lesson", section: "" },
  { label: "Worked example (easy)", section: "worked-example-1-easy" },
  { label: "Worked example (SAT level)", section: "worked-example-2-sat-level" },
];

export default async function UnitPage({ params }: PageProps<"/course/[unit]">) {
  const { unit } = await params;
  if (!isUnit(unit)) notFound();
  const { userId } = await requireUser();
  const levels = await getCourseLevels(userId);
  const section = DOMAINS[unit].section;
  const units = unitsOf(section);
  const idx = units.indexOf(unit);
  const skills = skillsIn(unit);
  const sectionName = section === "math" ? "SAT Math" : "SAT Reading and Writing";
  const here = `/course/${unit}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={`/course?section=${section}`} className="text-sm text-muted-foreground hover:text-foreground">{sectionName}</Link>
        <h1 className="text-2xl font-semibold">Unit {idx + 2}: {DOMAINS[unit].name}</h1>
        <p className="text-sm text-muted-foreground">
          {skills.length} skills. For each one, read the lesson, then practise until it feels easy. The quizzes and the unit test raise your level faster.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border p-5">
        <PointsBar {...points(skills.map((s) => levels[s.id]!.level))} />
        <LevelLegend />
      </section>

      <ol className="flex flex-col gap-3">
        {unitSteps(unit).map((step, i) => {
          if (step.kind === "skill") {
            const s = step.skill, lv = levels[s.id]!;
            return (
              <li key={i} className="flex flex-col gap-4 rounded-xl border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <LevelBox level={lv.level} className="mt-1 size-4" />
                    <div>
                      <h2 className="font-medium">{s.name}</h2>
                      <p className="text-sm text-muted-foreground">{LEVEL_BY_ID[lv.level].label}{lv.n ? ` · ${lv.mastery}% mastery` : ""}</p>
                    </div>
                  </div>
                  <Link href={`/skills/${s.id}`} className="shrink-0 text-sm text-muted-foreground underline">Skill page</Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Learn</p>
                    {LEARN.map((l) => (
                      <Link key={l.label} href={`/skills/${s.id}?tab=learn${l.section ? `&section=${l.section}#${l.section}` : ""}`} className="rounded-md px-2 py-1 text-sm hover:bg-muted">{l.label}</Link>
                    ))}
                  </div>
                  <div className="flex flex-col items-start gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Practice</p>
                    <p className="text-sm text-muted-foreground">5 questions at your level, with explanations after each one.</p>
                    <Button size="sm" variant={lv.level === "not-started" ? "default" : "outline"}
                      render={<Link href={`/practice?mode=set&skills=${s.id}&count=5&from=${here}`} />}>
                      {lv.level === "not-started" ? "Start" : "Practise again"}
                    </Button>
                  </div>
                </div>
              </li>
            );
          }
          const title = step.kind === "quiz" ? `${DOMAINS[unit].name}: quiz ${step.n}` : `${DOMAINS[unit].name}: unit test`;
          const count = checkCount(step.kind, step.skills.length);
          return (
            <li key={i} className="flex flex-col gap-3 rounded-xl border border-dashed p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-medium">{step.kind === "quiz" ? `Quiz ${step.n}` : "Unit test"}</h2>
                <p className="text-sm text-muted-foreground">
                  {step.kind === "quiz"
                    ? `Level up on ${step.skills.map((s) => s.name).join(", ")}.`
                    : "Check every skill in this unit at once."} {count} questions, untimed.
                </p>
              </div>
              <CourseCheckForm title={title} skillIds={step.skills.map((s) => s.id)} count={count}
                label={step.kind === "quiz" ? "Start quiz" : "Start unit test"} variant={step.kind === "quiz" ? "outline" : "default"} />
            </li>
          );
        })}
      </ol>

      <nav className="flex justify-between gap-2 text-sm">
        {idx > 0
          ? <Link href={`/course/${units[idx - 1]}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" />{DOMAINS[units[idx - 1]!].name}</Link>
          : <Link href="/course/about-the-sat" className="flex items-center gap-1 text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" />About the SAT</Link>}
        {idx < units.length - 1 && (
          <Link href={`/course/${units[idx + 1]}`} className="flex items-center gap-1 text-right text-muted-foreground hover:text-foreground">{DOMAINS[units[idx + 1]!].name}<ChevronRight className="size-4" /></Link>
        )}
      </nav>
    </div>
  );
}
