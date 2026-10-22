"use client";

import { useState, type ReactNode } from "react";
import { Markdown } from "@/components/markdown";
import { CBSE_SKILL_COVERAGE } from "@/content/cbse-skill-coverage";
import { likelyCoveredSkills } from "@/lib/curriculum-coverage";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Section = { heading: string; md: string };

/** A box like the Start page cards: the label shows in bold, and the body opens on click. Used for concepts and worked examples. */
function Reveal({ label, md, tryHref }: { label: string; md: string; tryHref?: string }) {
  return (
    <details className="group lesson-reveal min-w-0 overflow-hidden rounded-xl border">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 hover:bg-muted [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1 text-sm font-semibold">{label}</span>
        <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" />
      </summary>
      <div className="flex flex-col gap-3 border-t p-4">
        <Markdown className="text-[1em] leading-relaxed">{md}</Markdown>
        {tryHref && <Button variant="outline" className="min-h-11 self-start px-4 text-base" render={<Link href={tryHref} />}>Try a question</Button>}
      </div>
    </details>
  );
}

/** Teaching text: plain paragraphs render as normal, and a paragraph that starts with "**Answer:**" waits behind a Show answer button. */
function LearnBody({ md }: { md: string }) {
  const parts = md.split(/\n\n+/);
  const out: ReactNode[] = [];
  let buffer: string[] = [];
  const flush = (key: string) => {
    if (buffer.length) out.push(<Markdown key={key} className="text-[1em] leading-relaxed">{buffer.join("\n\n")}</Markdown>);
    buffer = [];
  };
  parts.forEach((part, i) => {
    if (/^\*\*Answer:?\*\*/.test(part)) {
      flush(`text${i}`);
      out.push(
        <details key={`answer${i}`} className="group/answer min-w-0">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted [&::-webkit-details-marker]:hidden">
            <span className="group-open/answer:hidden">Show answer</span>
            <span className="hidden group-open/answer:inline">Hide answer</span>
          </summary>
          <div className="mt-3"><Markdown className="text-[1em] leading-relaxed">{part}</Markdown></div>
        </details>,
      );
    } else buffer.push(part);
  });
  flush("text-end");
  return <>{out}</>;
}

/** A worked example: the problem shows when the box opens, and the steps stay hidden until the student asks for them. */
function WorkedExample({ label, md }: { label: string; md: string }) {
  const [problem = "", ...steps] = md.split(/\n\n+/);
  const solution = steps.join("\n\n");
  return (
    <details className="group lesson-reveal min-w-0 overflow-hidden rounded-xl border">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 hover:bg-muted [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1 text-sm font-semibold">{label}</span>
        <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" />
      </summary>
      <div className="flex flex-col gap-3 border-t p-4">
        <Markdown className="text-[1em] leading-relaxed">{problem}</Markdown>
        {solution && (
          <details className="group/solution min-w-0">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted [&::-webkit-details-marker]:hidden">
              <span className="group-open/solution:hidden">Show solution</span>
              <span className="hidden group-open/solution:inline">Hide solution</span>
              <ChevronRight className="size-4 shrink-0 transition-transform group-open/solution:rotate-90" />
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <Markdown className="text-[1em] leading-relaxed">{solution}</Markdown>
            </div>
          </details>
        )}
      </div>
    </details>
  );
}

export function LessonStudyView({ sections, skillId, stepKey, curriculum, grade, subjects, chaptersDone = [] }: {
  sections: Section[]; skillId: string; stepKey?: string; curriculum: string | null; grade: number | null; subjects: string[]; chaptersDone?: string[];
}) {
  const cov = CBSE_SKILL_COVERAGE[skillId];
  const eligible = curriculum === "cbse" && !!cov;
  const [revision, setRevision] = useState(false);
  const covered = eligible && likelyCoveredSkills({ curriculum, grade, subjects, topicsStudied: [], chaptersDone }).has(skillId);
  const basics = sections.filter(s => /^(What this skill|Learn the idea|Formulas|Worked example 1)/i.test(s.heading));
  const sat = sections.filter(s => !basics.includes(s));
  // Formulas stay in plain text, each `###` concept under them opens on click, and each worked example opens on click.
  const render = (items: Section[]) => items.map(sec => {
    if (/^Learn the idea/i.test(sec.heading)) {
      return <section key={sec.heading} className="flex min-w-0 flex-col gap-2">
        <h2 className="text-lg font-semibold">{sec.heading}</h2>
        <LearnBody md={sec.md} />
      </section>;
    }
    if (/^Worked example/i.test(sec.heading)) {
      return <section key={sec.heading} className="flex min-w-0 flex-col gap-3">
        <WorkedExample label={sec.heading.replace(/\((easy|medium|hard)\)/gi, "").trim()} md={sec.md} />
      </section>;
    }
    const [core = "", ...rest] = /^Formulas/i.test(sec.heading) ? sec.md.split(/^### /m) : [sec.md];
    const concepts = rest.map(part => {
      const nl = part.indexOf("\n");
      return { title: part.slice(0, nl).trim(), md: part.slice(nl + 1).trim() };
    });
    return (
      <section key={sec.heading} className="flex min-w-0 flex-col gap-2">
        <h2 className="text-lg font-semibold">{sec.heading.replace(/\((easy|medium|hard)\)/gi, "").trim()}</h2>
        <Markdown className="text-[1em] leading-relaxed">{core.trim()}</Markdown>
        {concepts.length > 0 && <div className="mt-2 flex flex-col gap-3">{concepts.map((c, i) => { const title = c.title.replace(/\$/g, ""); return <Reveal key={c.title} label={`Concept ${i + 1}: ${title}`} md={c.md} tryHref={stepKey ? `/start/${stepKey}/try?concept=${encodeURIComponent(title)}` : undefined} />; })}</div>}
      </section>
    );
  });
  return <div className="flex min-w-0 flex-col gap-6">
    {eligible && <div className="flex flex-col gap-3 rounded-xl border p-4">
      {cov.school === "none" ? (
        <p className="text-sm text-muted-foreground">CBSE doesn&apos;t teach this topic, so nothing here is school revision. Learn it in full: the SAT asks it directly, and the lesson below covers it from the ground up.</p>
      ) : (<>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" role="switch" checked={revision} onChange={e=>setRevision(e.target.checked)}/>CBSE revision view</label>
        {revision && <p className="text-sm text-muted-foreground">{
          covered
            ? `Your school chapters cover: ${cov.schoolSummary} Focus on the SAT additions: ${cov.satAdds.slice(0, 3).join(", ")}.`
            : cov.school === "partial"
              ? `School covers only part of this: ${cov.schoolSummary} You haven't marked the chapters that teach it, so start with the fundamentals.`
              : "School coverage varies. Start with the fundamentals here, then work through the SAT examples."
        } All lesson content remains available.</p>}
      </>)}
    </div>}
    {revision && cov?.school !== "none" ? <><section className="flex flex-col gap-3"><h2 className="text-xl font-semibold">School revision</h2><p className="text-sm text-muted-foreground">Review the key ideas and formulas before trying the examples.</p><details className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">Review fundamentals</summary><div className="mt-4 flex flex-col gap-6">{render(basics)}</div></details></section><section className="flex flex-col gap-6"><h2 className="text-xl font-semibold">SAT application</h2>{render(sat)}</section></> : render(sections)}
  </div>;
}
