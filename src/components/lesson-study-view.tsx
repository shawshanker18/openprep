"use client";

import Link from "next/link";
import { useState } from "react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { likelyCoveredSkills } from "@/lib/curriculum-coverage";

type Section = { heading: string; md: string };
/** The short summary a student reads first. Everything else is shown below the practice button, in cards. */
const KEY_IDEAS = /^(What this skill|Key ideas)/i;
const clean = (heading: string) => heading.replace(/\((easy|medium|hard)\)/gi, "").trim();

export function LessonStudyView({ sections, skillId, curriculum, grade, subjects, practiceHref }: {
  sections: Section[]; skillId: string; curriculum: string | null; grade: number | null; subjects: string[]; practiceHref: string;
}) {
  const eligible = curriculum === "cbse" && (grade === 11 || grade === 12);
  const [revision, setRevision] = useState(false);
  const [schoolGrade, setSchoolGrade] = useState<11 | 12>(grade === 12 ? 12 : 11);
  const covered = likelyCoveredSkills({ curriculum, grade: schoolGrade, subjects, topicsStudied: [] }).has(skillId);
  const keyIdeas = sections.filter((s) => KEY_IDEAS.test(s.heading));
  const rest = sections.filter((s) => !KEY_IDEAS.test(s.heading));

  // A card per section, collapsed except the first, so the page reads as steps rather than one long page.
  const card = (sec: Section, open: boolean) => (
    <details key={sec.heading} open={open} className="group rounded-2xl border bg-background p-5 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg font-semibold">
        {clean(sec.heading)}<span aria-hidden className="text-sm font-normal text-muted-foreground group-open:hidden">Show</span><span aria-hidden className="hidden text-sm font-normal text-muted-foreground group-open:inline">Hide</span>
      </summary>
      <Markdown className="mt-4 text-[1em] leading-relaxed">{sec.md}</Markdown>
    </details>
  );

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {eligible && <div className="flex flex-col gap-3 rounded-2xl border p-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" role="switch" checked={revision} onChange={(e) => setRevision(e.target.checked)} />CBSE revision view</label>
        {revision && <><label className="flex flex-wrap items-center gap-3 text-sm">CBSE grade <input aria-label="CBSE grade" type="range" min={11} max={12} step={1} value={schoolGrade} onChange={(e) => setSchoolGrade(Number(e.target.value) as 11 | 12)} /><span>{schoolGrade}</span></label><p className="text-sm text-muted-foreground">{covered ? "This topic is likely covered in your school syllabus. Review the fundamentals, then focus on the SAT examples and common traps." : "School coverage varies. Start with the fundamentals here, then work through the SAT examples."} All lesson content remains available.</p></>}
      </div>}

      {revision ? (
        <>
          <p className="text-sm text-muted-foreground">Review the fundamentals first, then the SAT examples.</p>
          {sections.filter((s) => /^(What this skill|Key ideas|Formulas|Worked example 1)/i.test(s.heading)).map((s) => card(s, false))}
          {rest.map((s) => card(s, false))}
        </>
      ) : (
        <>
          {keyIdeas.map((sec) => (
            <section key={sec.heading} className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <h2 className="text-xl font-semibold">{clean(sec.heading)}</h2>
              <Markdown className="text-[1em] leading-relaxed">{sec.md}</Markdown>
            </section>
          ))}

          <section aria-labelledby="try-two" className="flex flex-col gap-3 rounded-2xl bg-foreground p-5 text-background sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 id="try-two" className="text-lg font-semibold">Check it: two hard questions</h2>
              <p className="text-sm opacity-80">The hardest questions on this skill, so you see whether the ideas hold up.</p>
            </div>
            <Button variant="secondary" size="lg" render={<Link href={practiceHref} />}>Try 2 questions</Button>
          </section>

          {rest.map((sec, i) => card(sec, i === 0))}
        </>
      )}
    </div>
  );
}
