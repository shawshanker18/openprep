"use client";
// Question bank filter form. A topic is a shortcut for all of its skills: ticking it selects every skill, unticking it clears
// them, and it only shows as ticked when every one of its skills is. Only skills (and the subject) are submitted, so a partly
// chosen topic means exactly those skills. A subject change drops anything from the other subject.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus, RotateCcw, Search, Sparkles, Star, X } from "lucide-react";
import { DOMAINS, SKILLS, shortSkillName, type DomainId, type Section } from "@/content/taxonomy";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { STATUSES, type BankStatus } from "@/lib/bank-filters";

type Props = { subject: Section | null; domains: DomainId[]; skills: string[]; difficulties: (1 | 2 | 3)[]; status: BankStatus; saved: boolean; q: string; count: number };
const STATUS_LABEL: Record<BankStatus, string> = { any: "Any", unattempted: "Not attempted yet", attempted: "Attempted", missed: "Missed at least once" };
const DIFF = [[1, "Easy"], [2, "Medium"], [3, "Hard"]] as const;
const SUBJECTS = [[null, "All"], ["math", "Math"], ["rw", "Reading & Writing"]] as const;
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
      <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted peer-checked:hover:bg-foreground peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50 ${className}`}>{children}</span>
    </label>
  );
}
const field = "min-h-10 rounded-xl border border-border/80 bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

function Hidden() { return <input type="hidden" name="mode" value="bank" />; }

/** Live typing search input with autocomplete suggestions (Page 8) */
function Search_({ q, onSelectSkill, className = "" }: { q: string; onSelectSkill?: (id: string) => void; className?: string }) {
  const [val, setVal] = useState(q);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const query = val.trim().toLowerCase();
  const suggestions = query.length >= 2 ? SKILLS.filter((s) => s.name.toLowerCase().includes(query) || s.domain.includes(query)).slice(0, 6) : [];

  useEffect(() => {
    const clickOut = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id="bank-q"
        name="q"
        type="search"
        aria-label="Search questions"
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          setOpen(true);
        }}
        onFocus={() => { if (query.length >= 2) setOpen(true); }}
        maxLength={100}
        placeholder="Search questions or skills (e.g. linear, inferences, algebra)"
        className={`${field} w-full pl-10 pr-8`}
        autoComplete="off"
      />
      {val && (
        <button
          type="button"
          onClick={() => { setVal(""); setOpen(false); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}

      {/* Autocomplete Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-border/80 bg-popover p-1 shadow-lg backdrop-blur">
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Matching skills
          </div>
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setVal(s.name);
                onSelectSkill?.(s.id);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-muted transition-colors"
            >
              <span className="font-medium text-foreground">{s.name}</span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {s.domain.replace("-", " ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Selects({ p }: { p: Props }) {
  return (
    <>
      <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Attempt status
        <Choice
          name="status"
          defaultValue={p.status}
          options={STATUSES.map((v) => ({ value: v, label: STATUS_LABEL[v] }))}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Questions in a set
        <Choice
          name="count"
          defaultValue={String(p.count)}
          options={[10, 20, 30].map((n) => ({ value: String(n), label: `${n} questions` }))}
        />
      </label>
    </>
  );
}

const Saved = ({ saved }: { saved: boolean }) => (
  <label className="flex min-h-10 cursor-pointer items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
    <input type="checkbox" name="saved" value="1" defaultChecked={saved} className="size-4 accent-foreground" />
    Saved questions only
  </label>
);

function summary(b: Bank) {
  const parts = [b.s === "math" ? "Math" : b.s === "rw" ? "Reading & Writing" : "All subjects"];
  parts.push(b.ks.length ? `${b.ks.length} ${b.ks.length === 1 ? "skill" : "skills"}` : "all skills");
  parts.push(b.diffs.length === 0 || b.diffs.length === 3 ? "any difficulty" : DIFF.filter(([v]) => b.diffs.includes(v)).map(([, l]) => l.toLowerCase()).join(" + "));
  return parts.join(" · ");
}

/** Bottom Action Bar docked cleanly without hovering obstructively (Page 7) */
function ActionBar({ b, count }: { b: Bank; count: number }) {
  return (
    <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/95 p-3.5 shadow-xl backdrop-blur">
      <p className="min-w-0 flex-1 truncate text-xs sm:text-sm">
        <span className="font-bold text-foreground tabular-nums">{count} questions</span>
        <span className="text-muted-foreground"> · {summary(b)}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/question-bank" />} className="h-8 px-3 text-xs">
          <RotateCcw className="size-3.5 mr-1" />Clear
        </Button>
        <Button type="submit" size="sm" className="h-8 rounded-lg px-4 text-xs font-semibold">
          <Sparkles className="size-3.5 mr-1.5" />Practice<ArrowRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export function BankFilters(p: Props) {
  const b = useBank(p);
  const [favoriteSkills, setFavoriteSkills] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("openprep:bank-favorite-skills");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setFavoriteSkills(parsed);
      }
    } catch {
      // storage unavailable
    }
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = favoriteSkills.includes(id)
      ? favoriteSkills.filter((x) => x !== id)
      : [...favoriteSkills, id];
    setFavoriteSkills(updated);
    try {
      localStorage.setItem("openprep:bank-favorite-skills", JSON.stringify(updated));
    } catch {
      // storage unavailable
    }
  };

  return (
    <form action="/practice" method="get" aria-label="Filter questions" className="flex flex-col gap-6 pb-20">
      <Hidden />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Search_ q={p.q} onSelectSkill={(id) => b.toggleSkill(id)} className="flex-1" />
        <div role="radiogroup" aria-label="Subject" className="flex shrink-0 rounded-xl border border-border/80 bg-muted/40 p-1">
          {SUBJECTS.map(([v, label]) => (
            <label key={label} className="cursor-pointer">
              <input type="radio" name="subject" value={v ?? ""} checked={b.s === v} onChange={() => b.changeSubject(v)} className="peer sr-only" />
              <span className="flex min-h-8 items-center rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-xs peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Pinned Favorites Row (Page 7 convenience) */}
      {favoriteSkills.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Star className="size-3 fill-amber-500 text-amber-500" />
            <span>Pinned favorites ({favoriteSkills.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {favoriteSkills.map((id) => {
              const skill = SKILLS.find((x) => x.id === id);
              if (!skill) return null;
              const isSelected = b.ks.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => b.toggleSkill(id)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs transition-all ${
                    isSelected
                      ? "border-foreground bg-foreground text-background font-semibold"
                      : "border-border/80 bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{shortSkillName(skill.name)}</span>
                  <span
                    onClick={(e) => toggleFavorite(id, e)}
                    className="opacity-70 hover:opacity-100"
                    title="Unpin favorite"
                  >
                    ×
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <section aria-labelledby="bank-topics" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="bank-topics" className="text-sm font-semibold">
            Topics and skills <span className="font-normal text-muted-foreground">· click a skill to toggle, star to pin</span>
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {b.topicList.map((id) => {
            const own = skillsOf(id), picked = b.chosenIn(id), all = picked === own.length, some = picked > 0;
            return (
              <div key={id} className={`flex min-w-0 flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 transition-colors ${some ? "border-foreground/40 bg-muted/20" : ""}`}>
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={all} onChange={() => b.toggleTopic(id)} aria-label={`${DOMAINS[id].name}, all skills`} className="peer sr-only" />
                  <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-md border text-xs peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50 ${all ? "border-foreground bg-foreground text-background" : some ? "border-foreground bg-background text-foreground" : "bg-background text-transparent"}`}>
                    {some && !all ? <Minus className="size-3" /> : <Check className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1 font-semibold text-sm">{DOMAINS[id].name}</span>
                  <span className="text-xs text-muted-foreground">{some ? `${picked} of ${own.length}` : `${own.length} skills`}</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {own.map((x) => {
                    const isFav = favoriteSkills.includes(x.id);
                    const isSelected = b.ks.includes(x.id);
                    return (
                      <div key={x.id} className="inline-flex items-center">
                        <Pill name="skill" value={x.id} checked={isSelected} onChange={() => b.toggleSkill(x.id)} className="text-[0.78rem]">
                          {shortSkillName(x.name)}
                        </Pill>
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(x.id, e)}
                          title={isFav ? "Unpin favorite" : "Pin as favorite"}
                          className="ml-0.5 p-1 text-muted-foreground/60 hover:text-amber-500 transition-colors"
                        >
                          <Star className={`size-3 ${isFav ? "fill-amber-500 text-amber-500" : ""}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border/80 bg-card p-4 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">SAT difficulty</legend>
          <div className="flex gap-2">
            {DIFF.map(([v, l]) => <Pill key={v} name="difficulties" value={String(v)} checked={b.diffs.includes(v)} onChange={() => b.toggleDiff(v)}>{l}</Pill>)}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <Selects p={p} />
          <Saved saved={p.saved} />
        </div>
      </section>

      <ActionBar b={b} count={p.count} />
    </form>
  );
}
