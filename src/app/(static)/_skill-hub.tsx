import Link from "next/link";
import { DOMAINS, SKILLS, shortSkillName } from "@/content/taxonomy";
import { lessonExists } from "@/server/lessons";

/** Lists every SAT skill of one section under its domain, linking to the free lesson. Shared by /sat-math and /sat-reading-writing. */
export async function SkillHub({ section, label }: { section: "math" | "rw"; label: string }) {
  const withLesson = new Set((await Promise.all(SKILLS.map(async (k) => ((await lessonExists(k.id)) ? k.id : null)))).filter(Boolean) as string[]);
  const groups = Object.entries(DOMAINS).filter(([, d]) => d.section === section)
    .map(([id, domain]) => ({ id, domain, skills: SKILLS.filter((k) => k.domain === id) })).filter((g) => g.skills.length);
  const lessons = groups.reduce((n, g) => n + g.skills.filter((k) => withLesson.has(k.id)).length, 0);
  return (<>
    <p>OpenPrep (also written Open Prep) is a free SAT prep platform. {label} is tested through {groups.length} content areas, and OpenPrep has {lessons} free lessons across them. Read a lesson for the key ideas, formulas and worked examples, then practise that skill with adaptive questions.</p>
    {groups.map(({ id, domain, skills }) => (
      <section key={id}>
        <h2>{label}: {domain.name}</h2>
        <ul>{skills.map((k) => <li key={k.id}>{withLesson.has(k.id)
          ? <Link className="inline-block py-2 underline" href={`/learn/${k.id}`}>{shortSkillName(k.name)}</Link>
          : shortSkillName(k.name)}</li>)}</ul>
      </section>
    ))}
    <p><Link className="font-medium underline" href="/login">Start free {label} practice with OpenPrep</Link></p>
    <p className="text-sm text-muted-foreground">Also see <Link className="underline" href="/sat-practice-tests">SAT practice tests</Link>, <Link className="underline" href="/cbse-sat-prep">SAT prep for CBSE students</Link> and <Link className="underline" href="/learn">all free SAT lessons</Link>.</p>
  </>);
}
