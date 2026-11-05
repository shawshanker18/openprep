"use client";
// Adaptive Practice setup. Two modes are kept distinct: Adaptive changes difficulty from each answer, Mixed picks a
// random difficulty per question. Skills are only needed for Mixed, because Adaptive can use the student's own weekly
// focus when none are chosen.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Plus, X, BookmarkCheck } from "lucide-react";
import { DOMAINS, SKILLS, type DomainId, type Section } from "@/content/taxonomy";
import { SET_SIZES } from "@/lib/question-limits";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Mode = "adaptive" | "mixed";
const MODES: { value: Mode; label: string; help: string }[] = [
  { value: "adaptive", label: "Adaptive", help: "Each answer sets the next question's difficulty: one step harder after a correct answer, one step easier after a wrong one. Skills can be left empty to use your weekly focus." },
  { value: "mixed", label: "Mixed difficulty", help: "Each question's difficulty is picked at random from Easy, Medium and Hard. Not adaptive. Choose at least one skill." },
];
const MAX_SKILLS = 29;

type FavoriteCombo = { name: string; skills: string[]; isCustom?: boolean };

const DEFAULT_PRESETS: FavoriteCombo[] = [
  { name: "Algebra (All)", skills: SKILLS.filter((s) => s.domain === "m-alg").map((s) => s.id) },
  { name: "Advanced Math", skills: SKILLS.filter((s) => s.domain === "m-adv").map((s) => s.id) },
  { name: "Problem-Solving", skills: SKILLS.filter((s) => s.domain === "m-psda").map((s) => s.id) },
  { name: "Standard English", skills: SKILLS.filter((s) => s.domain === "rw-sec").map((s) => s.id) },
];

export function PracticeSetup() {
  const [mode, setMode] = useState<Mode>("adaptive");
  const [subject, setSubject] = useState<Section | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [count, setCount] = useState<number>(10);
  const [timed, setTimed] = useState<"auto" | "off">("auto");
  const [favorites, setFavorites] = useState<FavoriteCombo[]>(DEFAULT_PRESETS);
  const [comboName, setComboName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("openprep:favorite-combinations");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) setFavorites([...DEFAULT_PRESETS, ...parsed]);
      }
    } catch {
      // storage unavailable
    }
  }, []);

  const saveCustomCombo = () => {
    if (!chosen.length) {
      toast.error("Select at least one topic or skill to save as favorite");
      return;
    }
    const name = comboName.trim() || `Favorite (${chosen.length} skills)`;
    const newCombo: FavoriteCombo = { name, skills: [...chosen], isCustom: true };
    const customOnly = favorites.filter((f) => f.isCustom);
    const updatedCustom = [...customOnly, newCombo];
    try {
      localStorage.setItem("openprep:favorite-combinations", JSON.stringify(updatedCustom));
    } catch {
      // storage unavailable
    }
    setFavorites([...DEFAULT_PRESETS, ...updatedCustom]);
    setComboName("");
    setShowSaveInput(false);
    toast.success(`Saved "${name}" to favorite combinations`);
  };

  const removeFavorite = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedCustom = favorites.filter((f) => f.isCustom && f.name !== name);
    try {
      localStorage.setItem("openprep:favorite-combinations", JSON.stringify(updatedCustom));
    } catch {
      // storage unavailable
    }
    setFavorites([...DEFAULT_PRESETS, ...updatedCustom]);
    toast.info(`Removed "${name}" from favorites`);
  };

  const needsSkills = mode !== "adaptive";
  const canStart = !needsSkills || chosen.length > 0;
  const toggle = (id: string) => setChosen((old) => old.includes(id) ? old.filter((x) => x !== id) : [...old, id].slice(0, MAX_SKILLS));
  const inSubject = SKILLS.filter((s) => !subject || s.section === subject);
  const domains = (Object.keys(DOMAINS) as DomainId[]).filter((d) => !subject || DOMAINS[d].section === subject);

  const toggleDomain = (domainId: DomainId, e: React.MouseEvent) => {
    e.stopPropagation();
    const ids = SKILLS.filter((s) => s.domain === domainId && (!subject || s.section === subject)).map((s) => s.id);
    const allPicked = ids.length > 0 && ids.every((id) => chosen.includes(id));
    if (allPicked) {
      setChosen((old) => old.filter((x) => !ids.includes(x)));
    } else {
      setChosen((old) => [...new Set([...old, ...ids])].slice(0, MAX_SKILLS));
    }
  };

  const params = new URLSearchParams();
  if (mode === "adaptive") params.set("mode", "smart");
  else { params.set("mode", "set"); params.set("difficulty", "mixed"); }
  for (const id of chosen) params.append("skills", id);
  params.set("count", String(count));
  if (timed === "off") params.set("timing", "off");
  const href = `/practice?${params}`;

  return (
    <section aria-labelledby="setup" className="flex flex-col gap-6 rounded-2xl border border-border/70 bg-card p-6 shadow-xs">
      <h2 id="setup" className="text-xl font-bold tracking-tight">Set up practice</h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Practice mode</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map((m) => (
            <label key={m.value} className="flex cursor-pointer flex-col gap-1.5 rounded-xl border border-border/80 p-3.5 text-sm transition-colors hover:bg-muted/40 has-[:checked]:border-foreground/50 has-[:checked]:bg-muted/60">
              <span className="flex items-center gap-2 font-semibold text-foreground">
                <input type="radio" name="practice-mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} aria-describedby={`help-${m.value}`} className="accent-foreground" />
                {m.label}
              </span>
              <span id={`help-${m.value}`} className="text-xs text-muted-foreground leading-relaxed">{m.help}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Favorite Combinations & Presets */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Star className="size-3.5 fill-amber-500 text-amber-500" />
            <span>Favorite topic combinations</span>
          </div>
          {!showSaveInput ? (
            <button
              type="button"
              onClick={() => setShowSaveInput(true)}
              disabled={chosen.length === 0}
              className="inline-flex items-center gap-1 text-xs font-semibold text-foreground underline underline-offset-4 disabled:opacity-40"
            >
              <Plus className="size-3" /> Save current selection ({chosen.length})
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Combo name (e.g. My Math Focus)"
                value={comboName}
                onChange={(e) => setComboName(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs outline-none"
              />
              <button
                type="button"
                onClick={saveCustomCombo}
                className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowSaveInput(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {favorites.map((fav) => {
            const isMatch = fav.skills.length > 0 && fav.skills.length === chosen.length && fav.skills.every((id) => chosen.includes(id));
            return (
              <button
                key={fav.name}
                type="button"
                onClick={() => setChosen([...fav.skills])}
                className={`group inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                  isMatch
                    ? "border-foreground bg-foreground text-background shadow-xs font-semibold"
                    : "border-border/80 bg-background text-foreground hover:border-foreground/40 hover:bg-muted"
                }`}
              >
                {fav.isCustom && <BookmarkCheck className="size-3 text-amber-500" />}
                <span>{fav.name}</span>
                <span className="text-[10px] opacity-75 tabular-nums">({fav.skills.length})</span>
                {fav.isCustom && (
                  <span
                    onClick={(e) => removeFavorite(fav.name, e)}
                    className="ml-1 rounded-sm p-0.5 hover:bg-destructive/20 hover:text-destructive"
                    title="Remove favorite"
                  >
                    <X className="size-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Topics and skills {needsSkills ? "" : "(optional)"} · <span className="text-foreground font-semibold tabular-nums">{chosen.length} selected</span>
        </legend>
        <div className="flex flex-wrap items-center gap-2">
          {([[null, "All"], ["math", "Math"], ["rw", "Reading & Writing"]] as const).map(([value, label]) => (
            <label key={label} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-border/80 px-3.5 text-xs font-semibold transition-colors hover:bg-muted has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background">
              <input type="radio" name="practice-subject" checked={subject === value} onChange={() => setSubject(value)} className="sr-only" />
              {label}
            </label>
          ))}
          <button type="button" className="min-h-9 px-2 text-xs font-semibold underline underline-offset-4 text-muted-foreground hover:text-foreground" onClick={() => setChosen(inSubject.slice(0, MAX_SKILLS).map((s) => s.id))}>Select all</button>
          <button type="button" className="min-h-9 px-2 text-xs font-semibold underline underline-offset-4 text-muted-foreground hover:text-foreground" onClick={() => setChosen([])}>Clear</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {domains.map((d) => {
            const ids = SKILLS.filter((s) => s.domain === d && (!subject || s.section === subject)).map((s) => s.id);
            const picked = ids.filter((id) => chosen.includes(id)).length;
            const allPicked = ids.length > 0 && picked === ids.length;

            return (
              <details key={d} className="min-w-0 rounded-xl border border-border/70 bg-card p-3.5 transition-all hover:border-foreground/30">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-2 truncate">
                    <span>{DOMAINS[d].name}</span>
                    <span className="text-xs font-normal text-muted-foreground tabular-nums">
                      ({picked}/{ids.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => toggleDomain(d, e)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      allPicked
                        ? "bg-foreground text-background"
                        : "border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {allPicked ? "Deselect all" : `Select all ${DOMAINS[d].name}`}
                  </button>
                </summary>
                <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                  {SKILLS.filter((s) => s.domain === d && (!subject || s.section === subject)).map((s) => {
                    const isSelected = chosen.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggle(s.id)}
                        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                          isSelected
                            ? "border-foreground bg-foreground text-background font-semibold shadow-xs"
                            : "border-border/80 bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Questions</legend>
          <div className="flex flex-wrap gap-2">
            {SET_SIZES.filter((n) => n <= 30).map((n) => (
              <label key={n} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border/80 px-4 text-xs font-semibold transition-colors hover:bg-muted has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background">
                <input type="radio" name="practice-count" value={n} checked={count === n} onChange={() => setCount(n)} className="sr-only" />{n}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timer</legend>
          <div className="flex flex-wrap gap-2">
            {([["auto", "Timed, as on test day"], ["off", "No timer"]] as const).map(([v, label]) => (
              <label key={v} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border/80 px-4 text-xs font-semibold transition-colors hover:bg-muted has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background">
                <input type="radio" name="practice-timer" value={v} checked={timed === v} onChange={() => setTimed(v)} className="sr-only" />{label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-col items-start gap-2 border-t border-border/60 pt-4">
        <Button size="lg" className="h-11 rounded-lg px-7 font-semibold" disabled={!canStart} render={<Link href={href} prefetch={false} />}>
          Start practice
        </Button>
        {needsSkills && chosen.length === 0 && (
          <p className="text-xs text-muted-foreground">Pick at least one skill or favorite combo for mixed difficulty practice.</p>
        )}
      </div>
    </section>
  );
}
