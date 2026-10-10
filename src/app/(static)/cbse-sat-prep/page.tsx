import Link from "next/link";
import type { Metadata } from "next";
import { CBSE_CHAPTERS } from "@/content/cbse-chapters";
import { SKILL_BY_ID, shortSkillName } from "@/content/taxonomy";
import { lessonExists } from "@/server/lessons";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.openprep.site";
const GRADES = [9, 10, 11, 12] as const;

export const metadata: Metadata = {
  title: "CBSE SAT prep: free SAT preparation for CBSE students",
  description: "OpenPrep (Open Prep) is free SAT prep for CBSE students. Tick the NCERT maths chapters you have finished in Classes 9 to 12 and see which SAT Math skills you have likely already met in school.",
  keywords: ["CBSE SAT prep", "SAT prep for CBSE students", "OpenPrep CBSE", "Open Prep CBSE", "SAT for CBSE students", "NCERT to SAT"],
  alternates: { canonical: "/cbse-sat-prep" },
};

const faqs = [
  { q: "What is OpenPrep for CBSE students?", a: "OpenPrep (also written Open Prep) is a free SAT prep platform. For CBSE students it lets you tick the maths chapters you have finished in Classes 9 to 12, then marks the matching SAT Math skills as likely covered in school." },
  { q: "Is OpenPrep free for CBSE students?", a: "Yes. OpenPrep is free. There is no subscription and there are no ads." },
  { q: "Does ticking a CBSE chapter skip SAT lessons?", a: "No. A lesson is never removed. Ticking a chapter marks the SAT skills it overlaps with as likely covered in school and gives you a slightly higher starting estimate, so you can skim those lessons. Your own practice answers decide your real level." },
  { q: "Which CBSE classes does OpenPrep cover?", a: "The chapter list covers CBSE (NCERT) maths for Classes 9, 10, 11 and 12. If you choose your class, chapters from the classes below it are treated as already studied, and you can change that at any time." },
  { q: "What about SAT Reading and Writing?", a: "The CBSE chapter list covers maths only. SAT Reading and Writing is practised with OpenPrep's questions, adaptive practice and free lessons, whatever your school subjects." },
];

export default async function CbseSatPrep() {
  const skillIds = [...new Set(CBSE_CHAPTERS.flatMap((ch) => ch.skills))];
  const hasLesson = new Set((await Promise.all(skillIds.map(async (id) => ((await lessonExists(id)) ? id : null)))).filter((id): id is string => !!id));
  const ld = [
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "OpenPrep", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "CBSE SAT prep", item: `${SITE}/cbse-sat-prep` },
    ] },
  ];
  return (<>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
    <h1>SAT prep for CBSE students</h1>
    <p>OpenPrep (also written Open Prep) is a free SAT prep platform built to work alongside your CBSE maths. Tell it which NCERT maths chapters you have finished in Classes 9 to 12, and it shows which SAT Math skills you have likely already met in school, so you can spend your time where the gaps are.</p>
    <p><Link className="font-medium underline" href="/login">Start free CBSE SAT prep with OpenPrep</Link></p>
    <h2>How OpenPrep works for CBSE students</h2>
    <ul>
      <li>Tick the CBSE maths chapters you have finished, class by class, or tick a whole class at once.</li>
      <li>The SAT skills those chapters overlap with are marked &ldquo;Likely covered in school&rdquo;, and your starting estimate is slightly higher for them.</li>
      <li>No lesson is ever removed. You can skim the skills you know and open any lesson whenever you want.</li>
      <li>Your real level comes from your practice answers, not from the chapter list.</li>
      <li>Everything else is the same free OpenPrep: adaptive practice, over 13,000 SAT questions, full-length practice tests and a personal study plan.</li>
    </ul>
    <h2>Which CBSE maths chapters overlap with SAT Math</h2>
    <p>This is the mapping OpenPrep uses. It is a guide to where school maths and SAT Math meet, not a claim that a chapter fully covers an SAT skill. Chapters with no SAT counterpart, such as calculus and vectors, are in the picker but map to nothing.</p>
    {GRADES.map((g) => {
      const rows = CBSE_CHAPTERS.filter((ch) => ch.grade === g && ch.skills.length);
      return (
        <section key={g}>
          <h2>CBSE Class {g} maths and the SAT</h2>
          <ul>{rows.map((ch) => (
            <li key={ch.id}><b>{ch.title}</b>: {ch.skills.map((id, i) => {
              const skill = SKILL_BY_ID[id];
              if (!skill) return null;
              const name = shortSkillName(skill.name);
              return <span key={id}>{i > 0 && ", "}{hasLesson.has(id) ? <Link className="underline" href={`/learn/${id}`}>{name}</Link> : name}</span>;
            })}</li>
          ))}</ul>
        </section>
      );
    })}
    <h2>CBSE SAT prep questions, answered</h2>
    {faqs.map(({ q, a }) => (<div key={q}><p className="font-medium">{q}</p><p>{a}</p></div>))}
    <p><Link className="font-medium underline" href="/login">Start practising SAT for free</Link> or <Link className="underline" href="/learn">browse all free SAT lessons</Link>.</p>
  </>);
}
