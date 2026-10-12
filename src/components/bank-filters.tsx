"use client";
// Question bank filter form. Topics and skills are checkboxes, so several of each can be chosen. Ticking a skill also
// ticks its topic, unticking a topic clears its skills, and a subject change clears anything from the other subject.
import { useState } from "react";
import Link from "next/link";
import { DOMAINS, SKILLS, type DomainId, type Section } from "@/content/taxonomy";
import { Button } from "@/components/ui/button";
import { STATUSES, type BankStatus } from "@/lib/bank-filters";

const STATUS_LABEL: Record<BankStatus, string> = {
  any: "Any", unattempted: "Not attempted yet", attempted: "Attempted", missed: "Missed at least once",
};
const DIFF = [[1, "Easy"], [2, "Medium"], [3, "Hard"]] as const;
const domainOfSkill = (id: string) => SKILLS.find((s) => s.id === id)!.domain;
const sectionOfDomain = (id: DomainId): Section => DOMAINS[id].section;

export function BankFilters({ subject, domains, skills, difficulties, status, saved, q, count }: {
  subject: Section | null; domains: DomainId[]; skills: string[]; difficulties: (1 | 2 | 3)[];
  status: BankStatus; saved: boolean; q: string; count: number;
}) {
  const [s, setS] = useState<Section | null>(subject);
  const [ds, setDs] = useState<DomainId[]>(domains);
  const [ks, setKs] = useState<string[]>(skills);
  const topicList = (Object.keys(DOMAINS) as DomainId[]).filter((id) => !s || sectionOfDomain(id) === s);

  const changeSubject = (value: Section | null) => {
    setS(value);
    setDs((old) => old.filter((d) => !value || sectionOfDomain(d) === value));
    setKs((old) => old.filter((k) => !value || SKILLS.find((x) => x.id === k)!.section === value));
  };
  const toggleTopic = (id: DomainId) => {
    if (ds.includes(id)) {
      setDs((old) => old.filter((d) => d !== id));
      setKs((old) => old.filter((k) => domainOfSkill(k) !== id));
    } else {
      setDs((old) => [...old, id]);
    }
  };
  const toggleSkill = (id: string) => {
    if (ks.includes(id)) {
      setKs((old) => old.filter((k) => k !== id));
    } else {
      setKs((old) => [...old, id]);
      const topic = domainOfSkill(id);
      setDs((old) => (old.includes(topic) ? old : [...old, topic]));
    }
  };

  return (
    <form action="/question-bank" method="get" className="flex flex-col gap-5 rounded-xl border p-5" aria-label="Filter questions">
      <div className="flex flex-col gap-2">
        <label htmlFor="bank-q" className="text-sm font-medium">Search</label>
        <input id="bank-q" name="q" type="search" defaultValue={q} maxLength={100} placeholder="Words in the question, or a skill name"
          className="min-h-11 rounded-md border bg-background px-3 text-sm" />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Subject</legend>
        <div className="flex flex-wrap gap-2">
          {([[null, "All"], ["math", "Math"], ["rw", "Reading and Writing"]] as const).map(([value, label]) => (
            <label key={label} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:checked]:bg-muted">
              <input type="radio" name="subject" value={value ?? ""} checked={s === value} onChange={() => changeSubject(value)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Topics and skills</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {topicList.map((id) => {
            const own = SKILLS.filter((x) => x.domain === id);
            const picked = own.filter((x) => ks.includes(x.id)).length;
            return (
              <div key={id} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
                <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                  <input type="checkbox" name="domain" value={id} checked={ds.includes(id)} onChange={() => toggleTopic(id)} />
                  {DOMAINS[id].name}
                </label>
                <details className="text-sm">
                  <summary className="cursor-pointer py-1 text-muted-foreground">Skills · {picked} of {own.length} chosen</summary>
                  <div className="mt-2 flex flex-col gap-2 pl-1">
                    {own.map((x) => (
                      <label key={x.id} className="flex min-h-11 items-start gap-2">
                        <input type="checkbox" name="skill" value={x.id} checked={ks.includes(x.id)} onChange={() => toggleSkill(x.id)} className="mt-3" />
                        <span className="pt-3">{x.name}</span>
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">SAT difficulty</legend>
        <div className="flex flex-wrap gap-2">
          {DIFF.map(([v, label]) => (
            <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:checked]:bg-muted">
              <input type="checkbox" name="difficulties" value={v} defaultChecked={difficulties.includes(v)} />{label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium">Attempt status
          <select name="status" defaultValue={status} className="min-h-11 rounded-md border bg-background px-3 text-sm font-normal">
            {STATUSES.map((v) => <option key={v} value={v}>{STATUS_LABEL[v]}</option>)}
          </select>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 self-end text-sm">
          <input type="checkbox" name="saved" value="1" defaultChecked={saved} />Saved questions only
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm font-medium sm:max-w-xs">Questions in a practice set
        <select name="count" defaultValue={String(count)} className="min-h-11 rounded-md border bg-background px-3 text-sm font-normal">
          {[10, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>

      <div className="flex flex-wrap gap-3">
        <Button type="submit">Show questions</Button>
        <Button variant="outline" render={<Link href="/question-bank" />}>Clear all</Button>
      </div>
    </form>
  );
}
