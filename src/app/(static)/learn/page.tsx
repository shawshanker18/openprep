import Link from "next/link";
import type { Metadata } from "next";
import { DOMAINS, SKILLS } from "@/content/taxonomy";
import { lessonExists } from "@/server/lessons";

export const metadata: Metadata = {
  title: "Free SAT lessons: every Math and Reading & Writing skill",
  description: "Free SAT lessons from OpenPrep (Open Prep): key ideas, formulas, worked examples and common traps for every SAT Math and Reading and Writing skill.",
  alternates: { canonical: "/learn" },
};

export default async function LearnIndex() {
  const withLesson = new Set((await Promise.all(SKILLS.map(async (k) => ((await lessonExists(k.id)) ? k.id : null)))).filter(Boolean) as string[]);
  const groups = Object.entries(DOMAINS).map(([id, domain]) => ({ id, domain, skills: SKILLS.filter((k) => k.domain === id && withLesson.has(k.id)) })).filter((g) => g.skills.length);
  return (<>
    <h1>Free SAT lessons</h1>
    <p>OpenPrep (also written Open Prep) is a free SAT prep platform. These lessons cover every tested skill in SAT Math and SAT Reading and Writing: the key ideas, the formulas, worked examples from easy to hard, and the traps that cost points. Read one, then practice that skill for free.</p>
    {groups.map(({ id, domain, skills }) => (
      <section key={id}>
        <h2>{domain.section === "math" ? "SAT Math" : "SAT Reading and Writing"}: {domain.name}</h2>
        <ul>{skills.map((k) => <li key={k.id}><Link className="inline-block py-2 underline" href={`/learn/${k.id}`}>{k.name}</Link></li>)}</ul>
      </section>
    ))}
    <p><Link className="font-medium underline" href="/login">Start free practice with OpenPrep</Link></p>
  </>);
}
