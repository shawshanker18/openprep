"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Bookmark, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { QuestionView } from "@/components/question-view";
import { DesmosCalculator, DesmosToggle } from "@/components/desmos-panel";
import { TutorPanel } from "@/components/tutor-panel";
import { MISTAKE_LABEL, MISTAKE_TYPES, type MistakeType } from "@/engine/mistakes";
import { cn } from "@/lib/utils";
import type { PublicQuestion, RevealedQuestion } from "@/server/questions";
import { setBlockDone } from "../plan/actions";
import { nextQuestion, reportQuestion, setMistakeType, submitAnswer, toggleBookmark } from "./actions";

type Mode = "skill" | "smart" | "review";
type Result = {
  correct: boolean; attemptId: string; revealed: RevealedQuestion; masteryBefore: number; masteryAfter: number;
  mistakeGuess: string | null; skillName: string;
};
type State =
  | { phase: "loading"; seen: string[]; answered: number }
  | { phase: "done"; seen: string[]; answered: number }
  | { phase: "answering"; seen: string[]; answered: number; q: PublicQuestion; value: string | null }
  | { phase: "revealed"; seen: string[]; answered: number; q: PublicQuestion; value: string | null; r: Result; mistake: string | null };
type Action =
  | { type: "loaded"; q: PublicQuestion } | { type: "done" } | { type: "select"; value: string | null }
  | { type: "revealed"; r: Result } | { type: "mistake"; m: string } | { type: "next" };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "loaded": return { phase: "answering", seen: [...s.seen, a.q.id], answered: s.answered, q: a.q, value: null };
    case "done": return { phase: "done", seen: s.seen, answered: s.answered };
    case "select": return s.phase === "answering" ? { ...s, value: a.value } : s;
    case "revealed": return s.phase === "answering" ? { ...s, phase: "revealed", r: a.r, mistake: a.r.mistakeGuess, answered: s.answered + 1 } : s;
    case "mistake": return s.phase === "revealed" ? { ...s, mistake: a.m } : s;
    case "next": return { phase: "loading", seen: s.seen, answered: s.answered };
  }
}

const elapsedMs = (since: number, hidden: number) => Math.round(performance.now() - since - hidden);
const CONFIDENCE = [{ v: 1, label: "Guessed" }, { v: 2, label: "Unsure" }, { v: 3, label: "Sure" }] as const;

export function PracticeRunner({ mode, skillId, difficulty, title, block }: {
  mode: Mode; skillId?: string; difficulty?: 1 | 2 | 3; title: string; block?: { index: number; target: number } | null;
}) {
  const [s, dispatch] = useReducer(reducer, { phase: "loading", seen: [], answered: 0 });
  const [pending, start] = useTransition();
  const shownAt = useRef(0);
  const hiddenMs = useRef(0);
  const hiddenSince = useRef<number | null>(null);

  const load = useCallback((exclude: string[]) => start(async () => {
    const res = await nextQuestion({ mode, skillId, difficulty, exclude });
    if (!res.ok) { toast.error(res.error); return; }
    if ("done" in res.data) dispatch({ type: "done" });
    else { dispatch({ type: "loaded", q: res.data.question }); shownAt.current = performance.now(); hiddenMs.current = 0; }
  }), [mode, skillId, difficulty]);

  useEffect(() => { if (s.phase === "loading") load(s.seen); }, [s.phase, s.seen, load]);

  // Today's plan block is done once enough questions are answered.
  useEffect(() => {
    if (block && s.answered === block.target) {
      setBlockDone(block.index, true).then(() => toast.success("Plan block complete — keep going or head back to your dashboard."));
    }
  }, [block, s.answered]);

  // Pause the silent timer while the tab is hidden.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) hiddenSince.current = performance.now();
      else if (hiddenSince.current != null) { hiddenMs.current += performance.now() - hiddenSince.current; hiddenSince.current = null; }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const submit = (confidence: 1 | 2 | 3) => {
    if (s.phase !== "answering" || s.value === null) return;
    const timeMs = elapsedMs(shownAt.current, hiddenMs.current);
    start(async () => {
      const res = await submitAnswer({ questionId: s.q.id, response: s.value, timeMs, confidence });
      if (!res.ok) toast.error(res.error);
      else dispatch({ type: "revealed", r: res.data });
    });
  };

  // Keyboard: 1–4 / A–D choose, Enter = next after reveal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      if (s.phase === "answering" && s.q.type === "mcq") {
        const i = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
        if (i >= 0) dispatch({ type: "select", value: "ABCD"[i]! });
      }
      if (s.phase === "revealed" && e.key === "Enter") dispatch({ type: "next" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s]);

  if (s.phase === "loading") return <p className="text-muted-foreground">Loading…</p>;
  if (s.phase === "done") {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-xl font-semibold">{mode === "review" ? "No reviews due" : "No more questions here yet"}</h1>
        <p className="text-muted-foreground">
          {mode === "review" ? "You're all caught up. Missed questions come back after 1, 3 and 7 days."
            : "Questions for this skill are coming soon. Try another skill or the lesson."}
          {s.answered > 0 && ` You answered ${s.answered} this session.`}
        </p>
        <Button render={<Link href="/dashboard" />}>Back to dashboard</Button>
      </div>
    );
  }

  const r = s.phase === "revealed" ? s.r : null;
  const mistake = s.phase === "revealed" ? s.mistake : null;
  const correctChoice = r && "choice" in r.revealed.answer ? r.revealed.answer.choice : null;
  const rationale = r && !r.correct && s.value ? r.revealed.choiceRationales?.[s.value] : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{title} · {s.answered} answered{block && s.answered < block.target && ` · ${block.target - s.answered} to finish this block`}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" aria-label="Bookmark" onClick={async () => {
            const res = await toggleBookmark({ questionId: s.q.id });
            if (res.ok) toast(res.data.bookmarked ? "Bookmarked" : "Bookmark removed");
          }}><Bookmark /></Button>
          <Button variant="ghost" size="sm" aria-label="Report question" onClick={async () => {
            const note = window.prompt("What's wrong with this question? (optional)") ?? undefined;
            const res = await reportQuestion({ questionId: s.q.id, reason: "other", note });
            toast[res.ok ? "success" : "error"](res.ok ? "Thanks — we'll take a look." : res.error);
          }}><Flag /></Button>
        </div>
      </div>

      <QuestionView key={s.q.id} question={s.q} value={s.value} disabled={s.phase === "revealed" || pending}
        onChange={(v) => dispatch({ type: "select", value: v })} correct={correctChoice} />

      {s.phase === "answering" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-start gap-2">
            <TutorPanel questionId={s.q.id} answered={false} isMath={s.q.section === "math"} />
            {s.q.section === "math" && <DesmosToggle />}
          </div>
          <span className="text-sm text-muted-foreground">How sure are you? (this submits your answer)</span>
          <div className="flex flex-wrap gap-2">
            {CONFIDENCE.map((c) => (
              <Button key={c.v} size="lg" variant={c.v === 3 ? "default" : "outline"}
                disabled={s.value === null || pending} onClick={() => submit(c.v)}>{c.label}</Button>
            ))}
          </div>
        </div>
      )}

      {r && (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={cn("font-semibold", r.correct ? "text-emerald-700" : "text-red-700")}>
              {r.correct ? "✓ Correct" : `✗ Not quite${"accepted" in r.revealed.answer ? ` — accepted answer: ${r.revealed.answer.accepted.join(" or ")}` : ""}`}
            </p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
              {r.skillName}: {r.masteryBefore}% → {r.masteryAfter}%
            </span>
          </div>
          {rationale && <p className="text-sm"><b>Why {s.value} is wrong:</b> {rationale}</p>}
          <Explanation q={r.revealed} />
          {!r.correct && (
            <div className="flex flex-col gap-2">
              <span className="text-sm">What went wrong?</span>
              <div className="flex flex-wrap gap-1.5">
                {MISTAKE_TYPES.map((m) => (
                  <button key={m} type="button" aria-pressed={mistake === m}
                    onClick={async () => { dispatch({ type: "mistake", m }); await setMistakeType({ attemptId: r.attemptId, type: m }); }}
                    className={cn("rounded-full border px-3 py-1 text-xs", mistake === m ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                    {MISTAKE_LABEL[m as MistakeType]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => dispatch({ type: "next" })}>Next</Button>
            <TutorPanel questionId={s.q.id} answered isMath={s.q.section === "math"} wrongChoice={!r.correct && s.q.type === "mcq" ? s.value : null} />
          </div>
        </div>
      )}
    </div>
  );
}

function Explanation({ q }: { q: RevealedQuestion }) {
  const tabs = [
    { id: "hand", label: "By hand", md: q.explanationMd },
    q.desmos && { id: "desmos", label: "Desmos", md: q.desmos.stepsMd },
    q.fastMethodMd && { id: "fast", label: "Fastest", md: q.fastMethodMd },
  ].filter(Boolean) as { id: string; label: string; md: string }[];
  const [tab, setTab] = useReducer((_: string, t: string) => t, "hand");
  const cur = tabs.find((t) => t.id === tab) ?? tabs[0]!;
  return (
    <div className="flex flex-col gap-2">
      {tabs.length > 1 && (
        <div role="tablist" className="flex gap-1 text-sm">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={t.id === cur.id} onClick={() => setTab(t.id)}
              className={cn("rounded-md px-3 py-1", t.id === cur.id ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted")}>{t.label}</button>
          ))}
        </div>
      )}
      <Markdown className="text-sm">{cur.md}</Markdown>
      {cur.id === "desmos" && q.desmos && <DesmosCalculator expressions={q.desmos.expressions} className="h-72" />}
    </div>
  );
}
