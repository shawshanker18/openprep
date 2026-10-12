"use client";
// Adaptive Practice setup. Three modes are kept distinct: Adaptive changes difficulty from each answer, Fixed
// keeps one difficulty, Mixed picks a random difficulty per question. Skills are only needed for Fixed and Mixed, because
// Adaptive can use the student's own weekly focus when none are chosen.
import { useState } from "react";
import Link from "next/link";
import { DOMAINS, SKILLS, type DomainId, type Section } from "@/content/taxonomy";
import { SET_SIZES } from "@/lib/question-limits";
import { Button } from "@/components/ui/button";

type Mode = "adaptive" | "fixed" | "mixed";
const MODES: { value: Mode; label: string; help: string }[] = [
  { value: "adaptive", label: "Adaptive", help: "Each answer sets the next question's difficulty: one step harder after a correct answer, one step easier after a wrong one. Skills can be left empty to use your weekly focus." },
  { value: "fixed", label: "Fixed difficulty", help: "Every question is at the difficulty you choose. Choose at least one skill." },
  { value: "mixed", label: "Mixed difficulty", help: "Each question's difficulty is picked at random from Easy, Medium and Hard. Not adaptive. Choose at least one skill." },
];
const DIFF = [["1", "Easy"], ["2", "Medium"], ["3", "Hard"]] as const;
const MAX_SKILLS = 29;

export function PracticeSetup() {
  const [mode, setMode] = useState<Mode>("adaptive");
  const [subject, setSubject] = useState<Section | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<"1" | "2" | "3">("2");
  const [count, setCount] = useState<number>(10);
  const [timed, setTimed] = useState<"auto" | "off">("auto");

  const needsSkills = mode !== "adaptive";
  const canStart = !needsSkills || chosen.length > 0;
  const toggle = (id: string) => setChosen((old) => old.includes(id) ? old.filter((x) => x !== id) : [...old, id].slice(0, MAX_SKILLS));
  const inSubject = SKILLS.filter((s) => !subject || s.section === subject);
  const domains = (Object.keys(DOMAINS) as DomainId[]).filter((d) => !subject || DOMAINS[d].section === subject);

  const params = new URLSearchParams();
  if (mode === "adaptive") params.set("mode", "smart");
  else { params.set("mode", "set"); params.set("difficulty", mode === "fixed" ? difficulty : "mixed"); }
  for (const id of chosen) params.append("skills", id);
  params.set("count", String(count));
  if (timed === "off") params.set("timing", "off");
  const href = `/practice?${params}`;

  return (
    <section aria-labelledby="setup" className="flex flex-col gap-6 rounded-xl border p-5">
      <h2 id="setup" className="text-lg font-semibold">Set up practice</h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Practice mode</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => (
            <label key={m.value} className="flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm has-[:checked]:bg-muted">
              <span className="flex items-center gap-2 font-medium">
                <input type="radio" name="practice-mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} aria-describedby={`help-${m.value}`} />
                {m.label}
              </span>
              <span id={`help-${m.value}`} className="text-xs text-muted-foreground">{m.help}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Topics and skills {needsSkills ? "" : "(optional)"} · {chosen.length} selected</legend>
        <div className="flex flex-wrap gap-2">
          {([[null, "All"], ["math", "Math"], ["rw", "Reading and Writing"]] as const).map(([value, label]) => (
            <label key={label} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:checked]:bg-muted">
              <input type="radio" name="practice-subject" checked={subject === value} onChange={() => setSubject(value)} />{label}
            </label>
          ))}
          <button type="button" className="min-h-11 px-2 text-sm underline underline-offset-4" onClick={() => setChosen(inSubject.slice(0, MAX_SKILLS).map((s) => s.id))}>Select all</button>
          <button type="button" className="min-h-11 px-2 text-sm underline underline-offset-4" onClick={() => setChosen([])}>Clear</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {domains.map((d) => {
            const ids = SKILLS.filter((s) => s.domain === d && (!subject || s.section === subject)).map((s) => s.id);
            const picked = ids.filter((id) => chosen.includes(id)).length;
            return (
              <details key={d} className="min-w-0 rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">{DOMAINS[d].name} · {picked} of {ids.length}</summary>
                <div className="mt-3 flex flex-col gap-2">
                  {SKILLS.filter((s) => s.domain === d && (!subject || s.section === subject)).map((s) => (
                    <label key={s.id} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" checked={chosen.includes(s.id)} onChange={() => toggle(s.id)} />{s.name}
                    </label>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </fieldset>

      {mode === "fixed" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Difficulty</legend>
          <div className="flex flex-wrap gap-2">
            {DIFF.map(([v, label]) => (
              <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:checked]:bg-muted">
                <input type="radio" name="practice-difficulty" value={v} checked={difficulty === v} onChange={() => setDifficulty(v)} />{label} (SAT)
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Questions</legend>
          <div className="flex flex-wrap gap-2">
            {SET_SIZES.filter((n) => n <= 30).map((n) => (
              <label key={n} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:checked]:bg-muted">
                <input type="radio" name="practice-count" value={n} checked={count === n} onChange={() => setCount(n)} />{n}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Timer</legend>
          <div className="flex flex-wrap gap-2">
            {([["auto", "Timed, as on test day"], ["off", "No timer"]] as const).map(([v, label]) => (
              <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:checked]:bg-muted">
                <input type="radio" name="practice-timer" value={v} checked={timed === v} onChange={() => setTimed(v)} />{label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-col gap-2">
        {canStart ? (
          <Button className="self-start" render={<Link href={href} prefetch={false} />}>Start practice</Button>
        ) : (
          <Button className="self-start" disabled>Start practice</Button>
        )}
        {!canStart && <p className="text-sm text-muted-foreground">Choose at least one topic or skill to start.</p>}
      </div>
    </section>
  );
}
