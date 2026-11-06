"use client";
// Adaptive Practice setup, laid out like the question bank filters (topic cards with skill pills, no plain checkboxes). Two modes are kept distinct: Adaptive changes difficulty from each answer, Mixed picks a
// random difficulty per question. Skills are only needed for Mixed, because Adaptive can use the student's own weekly
// focus when none are chosen.
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus, RotateCcw, Sparkles } from "lucide-react";
import { DOMAINS, SKILLS, shortSkillName, type DomainId, type Section } from "@/content/taxonomy";
import { SET_SIZES } from "@/lib/question-limits";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/bank-filters";

type Mode = "adaptive" | "mixed";
const MODES: { value: Mode; label: string; help: string }[] = [
  { value: "adaptive", label: "Adaptive", help: "Each answer sets the next question's difficulty: one step harder after a correct answer, one step easier after a wrong one. Skills can be left empty to use your weekly focus." },
  { value: "mixed", label: "Mixed difficulty", help: "Each question's difficulty is picked at random from Easy, Medium and Hard. Not adaptive. Choose at least one skill." },
];
const MAX_SKILLS = 29;

const SUBJECTS = [[null, "All"], ["math", "Math"], ["rw", "Reading and Writing"]] as const;
const skillsOf = (id: DomainId) => SKILLS.filter((x) => x.domain === id);

export function PracticeSetup() {
  const [mode, setMode] = useState<Mode>("adaptive");
  const [subject, setSubject] = useState<Section | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [count, setCount] = useState<number>(10);
  const [timed, setTimed] = useState<"auto" | "off">("auto");

  const needsSkills = mode !== "adaptive";
  const canStart = !needsSkills || chosen.length > 0;
  const topicList = (Object.keys(DOMAINS) as DomainId[]).filter((d) => !subject || DOMAINS[d].section === subject);
  const changeSubject = (v: Section | null) => { setSubject(v); setChosen((o) => o.filter((k) => !v || SKILLS.find((x) => x.id === k)!.section === v)); };
  const toggleSkill = (id: string) => setChosen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id].slice(0, MAX_SKILLS)));
  const toggleTopic = (id: DomainId) => {
    const own = skillsOf(id).map((x) => x.id);
    setChosen((o) => (own.every((k) => o.includes(k)) ? o.filter((k) => !own.includes(k)) : [...new Set([...o, ...own])].slice(0, MAX_SKILLS)));
  };

  const params = new URLSearchParams();
  if (mode === "adaptive") params.set("mode", "smart");
  else { params.set("mode", "set"); params.set("difficulty", "mixed"); }
  for (const id of chosen) params.append("skills", id);
  params.set("count", String(count));
  if (timed === "off") params.set("timing", "off");
  const href = `/practice?${params}`;

  const summary = [subject === "math" ? "Math" : subject === "rw" ? "Reading and Writing" : "All subjects", chosen.length ? `${chosen.length} ${chosen.length === 1 ? "skill" : "skills"}` : needsSkills ? "no skills yet" : "weekly focus", mode === "adaptive" ? "adaptive" : "mixed difficulty", timed === "off" ? "no timer" : "timed"].join(" · ");

  return (
    <section aria-label="Set up practice" className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2 rounded-xl border p-4">
        <legend className="px-1 text-sm font-medium">Practice mode</legend>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => <Pill key={m.value} type="radio" name="practice-mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)}>{m.label}</Pill>)}
        </div>
        <p className="text-xs text-muted-foreground">{MODES.find((m) => m.value === mode)!.help}</p>
      </fieldset>

      <div role="radiogroup" aria-label="Subject" className="flex w-fit rounded-xl border bg-muted/50 p-1">
        {SUBJECTS.map(([v, label]) => (
          <label key={label} className="cursor-pointer">
            <input type="radio" name="practice-subject" checked={subject === v} onChange={() => changeSubject(v)} className="peer sr-only" />
            <span className="flex min-h-9 items-center rounded-lg px-3.5 text-sm font-medium text-muted-foreground transition-colors peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">{label}</span>
          </label>
        ))}
      </div>

      <section aria-labelledby="setup-topics" className="flex flex-col gap-3">
        <h2 id="setup-topics" className="text-sm font-medium">Topics and skills {needsSkills ? "" : "(optional) "}<span className="font-normal text-muted-foreground">· tap a skill to narrow, or tick a topic for all of it</span></h2>
        <div className="grid gap-3 md:grid-cols-2">
          {topicList.map((id) => {
            const own = skillsOf(id), picked = own.filter((x) => chosen.includes(x.id)).length, all = picked === own.length, some = picked > 0;
            return (
              <div key={id} className={`flex min-w-0 flex-col gap-3 rounded-xl border p-4 transition-colors ${some ? "border-foreground/60 bg-muted/40" : ""}`}>
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={all} onChange={() => toggleTopic(id)} aria-label={`${DOMAINS[id].name}, all skills`} className="peer sr-only" />
                  <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-md border peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 ${all ? "border-foreground bg-foreground text-background" : some ? "border-foreground bg-background text-foreground" : "bg-background text-transparent"}`}>{some && !all ? <Minus className="size-3.5" /> : <Check className="size-3.5" />}</span>
                  <span className="min-w-0 flex-1 font-medium">{DOMAINS[id].name}</span>
                  <span className="text-xs text-muted-foreground">{some ? `${picked} of ${own.length}` : `${own.length} skills`}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {own.map((x) => <Pill key={x.id} name="skill" value={x.id} checked={chosen.includes(x.id)} onChange={() => toggleSkill(x.id)} className="text-[0.8rem]">{shortSkillName(x.name)}</Pill>)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 sm:gap-6">
        <fieldset className="flex flex-col gap-2"><legend className="mb-1.5 text-sm font-medium">Questions</legend>
          <div className="flex flex-wrap gap-2">{SET_SIZES.filter((n) => n <= 30).map((n) => <Pill key={n} type="radio" name="practice-count" value={String(n)} checked={count === n} onChange={() => setCount(n)}>{n}</Pill>)}</div>
        </fieldset>
        <fieldset className="flex flex-col gap-2"><legend className="mb-1.5 text-sm font-medium">Timer</legend>
          <div className="flex flex-wrap gap-2">
            {([["auto", "Timed, as on test day"], ["off", "No timer"]] as const).map(([v, label]) => <Pill key={v} type="radio" name="practice-timer" value={v} checked={timed === v} onChange={() => setTimed(v)}>{label}</Pill>)}
          </div>
        </fieldset>
      </section>

      <div className="sticky bottom-20 z-10 flex items-center gap-3 rounded-xl border bg-background/95 p-3 pl-4 shadow-lg backdrop-blur desk:bottom-4">
        <p className="min-w-0 flex-1 truncate text-sm"><span className="font-medium">{count} questions</span><span className="text-muted-foreground"> · {summary}</span></p>
        <Button variant="ghost" className="h-9 px-3" onClick={() => setChosen([])} disabled={chosen.length === 0}><RotateCcw />Clear</Button>
        {canStart ? (
          <Button className="h-9 px-4" render={<Link href={href} prefetch={false} />}><Sparkles />Start practice<ArrowRight /></Button>
        ) : (
          <Button className="h-9 px-4" disabled><Sparkles />Start practice<ArrowRight /></Button>
        )}
      </div>
      {!canStart && <p className="-mt-3 text-sm text-muted-foreground">Choose at least one topic or skill to start.</p>}
    </section>
  );
}
