"use client";
// Question bank filter form. A topic is a shortcut for all of its skills: ticking it selects every skill, unticking it clears
// them, and it only shows as ticked when every one of its skills is. Only skills (and the subject) are submitted, so a partly
// chosen topic means exactly those skills. A subject change drops anything from the other subject.
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus, RotateCcw, Search, Sparkles } from "lucide-react";
import { DOMAINS, SKILLS, shortSkillName, type DomainId, type Section } from "@/content/taxonomy";
import { Button } from "@/components/ui/button";
import { STATUSES, type BankStatus } from "@/lib/bank-filters";

type Props = { subject: Section | null; domains: DomainId[]; skills: string[]; difficulties: (1 | 2 | 3)[]; status: BankStatus; saved: boolean; q: string; count: number };
const STATUS_LABEL: Record<BankStatus, string> = { any: "Any", unattempted: "Not attempted yet", attempted: "Attempted", missed: "Missed at least once" };
const DIFF = [[1, "Easy"], [2, "Medium"], [3, "Hard"]] as const;
const SUBJECTS = [[null, "All"], ["math", "Math"], ["rw", "Reading and Writing"]] as const;
const skillsOf = (id: DomainId) => SKILLS.filter((x) => x.domain === id);

/** A topic in the link (?domain=) with no skills of its own chosen means all of its skills. */
function initialSkills(p: Props) {
  const out = new Set(p.skills);
  for (const d of p.domains) if (!p.skills.some((k) => SKILLS.find((x) => x.id === k)?.domain === d)) skillsOf(d).forEach((x) => out.add(x.id));
  return [...out];
}

function useBank(p: Props) {
  const [s, setS] = useState<Section | null>(p.subject);
  const [ks, setKs] = useState<string[]>(() => initialSkills(p));
  const [diffs, setDiffs] = useState<number[]>(p.difficulties);
  const topicList = (Object.keys(DOMAINS) as DomainId[]).filter((id) => !s || DOMAINS[id].section === s);
  const chosenIn = (id: DomainId) => skillsOf(id).filter((x) => ks.includes(x.id)).length;
  return {
    s, ks, diffs, topicList, chosenIn,
    changeSubject: (v: Section | null) => { setS(v); setKs((o) => o.filter((k) => !v || SKILLS.find((x) => x.id === k)!.section === v)); },
    toggleTopic: (id: DomainId) => {
      const own = skillsOf(id).map((x) => x.id);
      setKs((o) => (own.every((k) => o.includes(k)) ? o.filter((k) => !own.includes(k)) : [...new Set([...o, ...own])]));
    },
    toggleSkill: (id: string) => setKs((o) => (o.includes(id) ? o.filter((k) => k !== id) : [...o, id])),
    toggleDiff: (v: number) => setDiffs((o) => (o.includes(v) ? o.filter((x) => x !== v) : [...o, v])),
  };
}
type Bank = ReturnType<typeof useBank>;

function Pill({ type = "checkbox", name, value, checked, onChange, children, className = "" }: { type?: "checkbox" | "radio"; name: string; value: string; checked: boolean; onChange: () => void; children: React.ReactNode; className?: string }) {
  return (
    <label className="cursor-pointer">
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} className="peer sr-only" />
      <span className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors hover:bg-muted peer-checked:hover:bg-foreground peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 ${className}`}>{children}</span>
    </label>
  );
}
const field = "min-h-11 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Hidden() { return <input type="hidden" name="mode" value="bank" />; }
function Search_({ q, className = "", short = false }: { q: string; className?: string; short?: boolean }) {
  return (
    <div className={`relative ${className}`}>
      <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input id="bank-q" name="q" type="search" aria-label="Search questions" defaultValue={q} maxLength={100} placeholder={short ? "Search questions or skills" : "Search words in a question, or a skill name"} className={`${field} w-full pl-10`} />
    </div>
  );
}
function Selects({ p }: { p: Props }) {
  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Attempt status
        <select name="status" defaultValue={p.status} className={`${field} font-normal`}>{STATUSES.map((v) => <option key={v} value={v}>{STATUS_LABEL[v]}</option>)}</select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Questions in a set
        <select name="count" defaultValue={String(p.count)} className={`${field} font-normal`}>{[10, 20, 30].map((n) => <option key={n} value={n}>{n} questions</option>)}</select>
      </label>
    </>
  );
}
const Saved = ({ saved }: { saved: boolean }) => (
  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" name="saved" value="1" defaultChecked={saved} className="size-4 accent-foreground" />Saved questions only</label>
);
function summary(b: Bank) {
  const parts = [b.s === "math" ? "Math" : b.s === "rw" ? "Reading and Writing" : "All subjects"];
  parts.push(b.ks.length ? `${b.ks.length} ${b.ks.length === 1 ? "skill" : "skills"}` : "all skills");
  parts.push(b.diffs.length === 0 || b.diffs.length === 3 ? "any difficulty" : DIFF.filter(([v]) => b.diffs.includes(v)).map(([, l]) => l.toLowerCase()).join(" + "));
  return parts.join(" · ");
}

/** Sticky bar at the bottom of the form: what is picked, and the one button that matters. */
function ActionBar({ b, count }: { b: Bank; count: number }) {
  return (
    <div className="sticky bottom-20 z-10 flex items-center gap-3 rounded-xl border bg-background/95 p-3 pl-4 shadow-lg backdrop-blur desk:bottom-4">
      <p className="min-w-0 flex-1 truncate text-sm"><span className="font-medium">{count} questions</span><span className="text-muted-foreground"> · {summary(b)}</span></p>
      <Button variant="ghost" render={<Link href="/question-bank" />} className="h-9 px-3"><RotateCcw />Clear</Button>
      <Button type="submit" className="h-9 px-4"><Sparkles />Practice<ArrowRight /></Button>
    </div>
  );
}

/* ───────────────────────── A: topic cards with skill chips ───────────────────────── */
export function BankFilters(p: Props) {
  const b = useBank(p);
  return (
    <form action="/practice" method="get" aria-label="Filter questions" className="flex flex-col gap-6">
      <Hidden />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Search_ q={p.q} className="flex-1" />
        <div role="radiogroup" aria-label="Subject" className="flex shrink-0 rounded-xl border bg-muted/50 p-1">
          {SUBJECTS.map(([v, label]) => (
            <label key={label} className="cursor-pointer">
              <input type="radio" name="subject" value={v ?? ""} checked={b.s === v} onChange={() => b.changeSubject(v)} className="peer sr-only" />
              <span className="flex min-h-9 items-center rounded-lg px-3.5 text-sm font-medium text-muted-foreground transition-colors peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <section aria-labelledby="bank-topics" className="flex flex-col gap-3">
        <h2 id="bank-topics" className="text-sm font-medium">Topics and skills <span className="font-normal text-muted-foreground">· tap a skill to narrow, or tick a topic for all of it</span></h2>
        <div className="grid gap-3 md:grid-cols-2">
          {b.topicList.map((id) => {
            const own = skillsOf(id), picked = b.chosenIn(id), all = picked === own.length, some = picked > 0;
            return (
              <div key={id} className={`flex min-w-0 flex-col gap-3 rounded-xl border p-4 transition-colors ${some ? "border-foreground/60 bg-muted/40" : ""}`}>
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={all} onChange={() => b.toggleTopic(id)} aria-label={`${DOMAINS[id].name}, all skills`} className="peer sr-only" />
                  <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-md border peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 ${all ? "border-foreground bg-foreground text-background" : some ? "border-foreground bg-background text-foreground" : "bg-background text-transparent"}`}>{some && !all ? <Minus className="size-3.5" /> : <Check className="size-3.5" />}</span>
                  <span className="min-w-0 flex-1 font-medium">{DOMAINS[id].name}</span>
                  <span className="text-xs text-muted-foreground">{some ? `${picked} of ${own.length}` : `${own.length} skills`}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {own.map((x) => <Pill key={x.id} name="skill" value={x.id} checked={b.ks.includes(x.id)} onChange={() => b.toggleSkill(x.id)} className="text-[0.8rem]">{shortSkillName(x.name)}</Pill>)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border p-4 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-6">
        <fieldset className="flex flex-col gap-2"><legend className="mb-1.5 text-sm font-medium">SAT difficulty</legend>
          <div className="flex gap-2">{DIFF.map(([v, l]) => <Pill key={v} name="difficulties" value={String(v)} checked={b.diffs.includes(v)} onChange={() => b.toggleDiff(v)}>{l}</Pill>)}</div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <Selects p={p} /><Saved saved={p.saved} />
        </div>
      </section>
      <ActionBar b={b} count={p.count} />
    </form>
  );
}

