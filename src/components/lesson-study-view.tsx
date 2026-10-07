"use client";

import { useState } from "react";
import { Markdown } from "@/components/markdown";
import { likelyCoveredSkills } from "@/lib/curriculum-coverage";

type Section = { heading: string; md: string };
export function LessonStudyView({ sections, skillId, curriculum, grade, subjects }: {
  sections: Section[]; skillId: string; curriculum: string | null; grade: number | null; subjects: string[];
}) {
  const eligible = curriculum === "cbse" && (grade === 11 || grade === 12);
  const [revision, setRevision] = useState(false);
  const [schoolGrade, setSchoolGrade] = useState<11 | 12>(grade === 12 ? 12 : 11);
  const covered = likelyCoveredSkills({ curriculum, grade: schoolGrade, subjects, topicsStudied: [] }).has(skillId);
  const basics = sections.filter(s => /^(What this skill|Key ideas|Formulas|Worked example 1)/i.test(s.heading));
  const sat = sections.filter(s => !basics.includes(s));
  const render = (items: Section[]) => items.map(sec => <section key={sec.heading} className="flex min-w-0 flex-col gap-2"><h2 className="text-lg font-semibold">{sec.heading.replace(/\((easy|medium|hard)\)/gi, "").trim()}</h2><Markdown className="text-[15px]">{sec.md}</Markdown></section>);
  return <div className="flex min-w-0 flex-col gap-6">
    {eligible && <div className="flex flex-col gap-3 rounded-xl border p-4">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" role="switch" checked={revision} onChange={e=>setRevision(e.target.checked)}/>CBSE revision view</label>
      {revision && <><label className="flex flex-wrap items-center gap-3 text-sm">CBSE grade <input aria-label="CBSE grade" type="range" min={11} max={12} step={1} value={schoolGrade} onChange={e=>setSchoolGrade(Number(e.target.value) as 11 | 12)}/><span>{schoolGrade}</span></label><p className="text-sm text-muted-foreground">{covered ? "This topic is likely covered in your school syllabus. Review the fundamentals, then focus on the SAT examples and common traps." : "School coverage varies. Start with the fundamentals here, then work through the SAT examples."} All lesson content remains available.</p></>}
    </div>}
    {revision ? <><section className="flex flex-col gap-3"><h2 className="text-xl font-semibold">School revision</h2><p className="text-sm text-muted-foreground">Review the key ideas and formulas before trying the examples.</p><details className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">Review fundamentals</summary><div className="mt-4 flex flex-col gap-6">{render(basics)}</div></details></section><section className="flex flex-col gap-6"><h2 className="text-xl font-semibold">SAT application</h2>{render(sat)}</section></> : render(sections)}
  </div>;
}
