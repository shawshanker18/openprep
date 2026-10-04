"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { QuestionView } from "@/components/question-view";
import { DesmosCalculator, DesmosToggle } from "@/components/desmos-panel";
import { TutorPanel } from "@/components/tutor-panel";
import { FocusToggle } from "@/components/focus-toggle";
import { MISTAKE_LABEL, MISTAKE_TYPES, type MistakeType } from "@/engine/mistakes";
import { cn, isTyping } from "@/lib/utils";
import type { PublicQuestion, RevealedQuestion } from "@/server/questions";
import { nextQuestion, setMistakeType, submitAnswer, toggleBookmark } from "./actions";
import { ReportQuestion } from "./report-question";
import { readDraft, writeDraft, readPracticeProgress, writePracticeProgress } from "@/lib/answer-drafts";

type Mode = "skill" | "smart" | "review" | "set" | "list";
type SetConfig = { count: number };
type Result = {
  correct: boolean; attemptId: string; revealed: RevealedQuestion; masteryBefore: number; masteryAfter: number;
  mistakeGuess: string | null; skillName: string;
};
// `correct` / `ms` = running totals for the end-of-set summary.
type Base = { seen: string[]; answered: number; correct: number; ms: number };
type State =
  | ({ phase: "restoring" } & Base)
  | ({ phase: "loading" } & Base)
  | ({ phase: "error"; error: string } & Base)
  | ({ phase: "done" } & Base)
  | ({ phase: "answering"; q: PublicQuestion; value: string | null; limitS: number | null } & Base)
  | ({ phase: "revealed"; q: PublicQuestion; value: string | null; limitS: number | null; r: Result; mistake: string | null } & Base);
type Action =
  | { type: "restore"; progress:Base }
  | { type: "loaded"; q: PublicQuestion; limitS: number | null; value?:string|null } | { type: "done" } | { type: "select"; value: string | null }
  | { type: "revealed"; r: Result; timeMs: number } | { type: "mistake"; m: string } | { type: "next" } | { type: "failed"; error: string };

const base = (s: State): Base => ({ seen: s.seen, answered: s.answered, correct: s.correct, ms: s.ms });
function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "restore": return { ...a.progress, phase:"loading" };
    case "loaded": return { ...base(s), phase: "answering", seen: s.seen.includes(a.q.id)?s.seen:[...s.seen, a.q.id], q: a.q, value: a.value??null, limitS: a.limitS };
    case "done": return { ...base(s), phase: "done" };
    case "failed": return { ...base(s), phase: "error", error: a.error };
    case "select": return s.phase === "answering" ? { ...s, value: a.value } : s;
    case "revealed": return s.phase === "answering" ? {
      ...s, phase: "revealed", r: a.r, mistake: a.r.mistakeGuess, answered: s.answered + 1,
      correct: s.correct + (a.r.correct ? 1 : 0), ms: s.ms + a.timeMs,
    } : s;
    case "mistake": return s.phase === "revealed" ? { ...s, mistake: a.m } : s;
    case "next": return { ...base(s), phase: "loading" };
  }
}

const elapsedMs = (since: number, hidden: number) => Math.round(performance.now() - since - hidden);
const CONFIDENCE = [{ v: 1, label: "Guessed" }, { v: 2, label: "Unsure" }, { v: 3, label: "Sure" }] as const;
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/** Per-question countdown at SAT pace. Runs into overtime rather than cutting the student off. */
function Countdown({ limitS }: { limitS: number }) {
  const [left, setLeft] = useState(limitS);
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => setLeft(limitS - (performance.now() - t0) / 1000), 1000);
    return () => clearInterval(id);
  }, [limitS]);
  return <span className={cn("tabular-nums", left <= 0 && "text-red-700")}>{left > 0 ? clock(left) : `Time's up +${clock(-left)}`}</span>;
}

export function PracticeRunner({ paperId, userId, mode, title, block, set, back }: {
  paperId: string; userId: string; mode: Mode; title: string; block?: { index: number; target: number } | null;
  set?: SetConfig; back?: string;
}) {
  const [s, dispatch] = useReducer(reducer, { phase: "restoring", seen: [], answered: 0, correct: 0, ms: 0 });
  // On a phone the confidence buttons (and later the explanation) are often below the screen: bring them into view
  // after the first tap on a choice, and when the answer is revealed. Only as far as needed, never while typing.
  const confidenceRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const picked = s.phase === "answering" && s.value !== null && !!s.q.choices?.length;
  useEffect(() => { if (picked) confidenceRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [picked]);
  useEffect(() => { if (s.phase === "revealed") resultRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [s.phase]);
  const [pending, start] = useTransition();
  const shownAt = useRef(0);
  const hiddenMs = useRef(0);
  const hiddenSince = useRef<number | null>(null);
  const similarTo = useRef<string | null>(null); // skill of a just-missed question → next pick is a similar one
  const [bookmarked, setBookmarked] = useState(false); // the current question's, from the server
  const restored = useRef<{id:string;response:string|null}|null>(null);
  const draftKey = useRef('');
  useEffect(()=>{
    draftKey.current=`openprep:practice:${userId}:${window.location.pathname}${window.location.search}`;
    restored.current=readDraft(draftKey.current)[0]??null;
    dispatch({type:"restore",progress:readPracticeProgress(draftKey.current)});
  },[userId]);

  const load = useCallback((exclude: string[]) => start(async () => {
    const sim = similarTo.current;
    similarTo.current = null;
    const draft=restored.current;restored.current=null;
    const res = await nextQuestion({ paperId, exclude, similarTo: sim ?? undefined, resumeId:draft?.id })
      .catch(() => ({ ok: false as const, error: "Couldn't load the next question. Check your connection and try again." }));
    if (!res.ok) { restored.current=draft; dispatch({ type: "failed", error: res.error }); return; }
    if ("done" in res.data) dispatch({ type: "done" });
    else {
      dispatch({ type: "loaded", q: res.data.question, limitS: res.data.timeLimitS, value:res.data.question.id===draft?.id?draft.response:null });
      setBookmarked(res.data.bookmarked);
      shownAt.current = performance.now(); hiddenMs.current = 0;
    }
  }), [paperId]);
  // A set stops after `count` answers.
  const next = useCallback(() => dispatch({ type: set && s.answered >= set.count ? "done" : "next" }), [set, s.answered]);

  // Only the most recent 200 (the server's limit): a very long session keeps going instead of failing at question 201.
  useEffect(() => { if (s.phase === "loading") { if(set && s.answered>=set.count) dispatch({type:"done"}); else load(s.seen.slice(-200)); } }, [s.phase, s.seen, s.answered, set, load]);
  useEffect(()=>{
    if(!draftKey.current) return;
    if(s.phase==='answering') writeDraft(draftKey.current,[{id:s.q.id,position:0,response:s.value,flagged:false,timeMs:0}]);
    if(s.phase==='revealed' || s.phase==='done') writeDraft(draftKey.current,[]);
    if(s.phase==='answering' || s.phase==='revealed') writePracticeProgress(draftKey.current,base(s));
    if(s.phase==='done') writePracticeProgress(draftKey.current,null);
  },[s]);
  useEffect(()=>{
    const leave=(event:BeforeUnloadEvent)=>{if(s.phase==='answering' && s.value!==null){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',leave);
    return ()=>window.removeEventListener('beforeunload',leave);
  },[s]);

  // Today's plan block is done once enough questions are answered (the server counts them; this just says so).
  useEffect(() => {
    if (block && s.answered === block.target) toast.success("Plan block complete. Keep going, or head back to your dashboard.");
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
    if (pending || s.phase !== "answering" || s.value === null) return;
    const timeMs = elapsedMs(shownAt.current, hiddenMs.current);
    start(async () => {
      const res = await submitAnswer({ questionId: s.q.id, response: s.value, timeMs, confidence })
        .catch(() => ({ ok: false as const, error: "Couldn't submit your answer. Your selection is still here. Check your connection and try again." }));
      if (!res.ok) toast.error(res.error);
      else dispatch({ type: "revealed", r: res.data, timeMs });
    });
  };

  // Keyboard: 1–4 / A–D choose, Enter = next after reveal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pending || isTyping(e) || e.metaKey || e.ctrlKey) return;
      if (s.phase === "answering" && !!s.q.choices?.length) {
        const i = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
        if (i >= 0) dispatch({ type: "select", value: "ABCD"[i]! });
      }
      if (s.phase === "revealed" && e.key === "Enter") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s, next, pending]);

  if (s.phase === "loading" || s.phase === "restoring") return <p className="text-muted-foreground">Loading…</p>;
  if (s.phase === "error") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-sm">{s.error}</p>
        <Button variant="outline" onClick={() => dispatch({ type: "next" })}>Try again</Button>
      </div>
    );
  }
  if (s.phase === "done" && set) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-xl font-semibold">{s.answered >= set.count ? (back ? "Exercise complete" : "Set complete") : mode === "list" ? "You've finished these questions" : "No more matching questions"}</h1>
        <p className="text-muted-foreground tabular-nums">
          {s.answered > 0 ? `${s.correct}/${s.answered} correct · average ${Math.round(s.ms / s.answered / 1000)}s per question.` : "Try other skills or sub-topics."}
        </p>
        <div className="flex flex-wrap gap-2">
          {back ? <Button render={<Link href={back} />}>{back.startsWith("/question-bank") ? "Back to the question bank" : back.startsWith('/bookmarks')?'Back to saved questions':"Back to the course"}</Button> : <Button render={<Link href="/practice/custom" />}>New custom set</Button>}
          <Button variant="outline" render={<Link href="/dashboard" />}>Back to dashboard</Button>
        </div>
      </div>
    );
  }
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
        <span>
          {title} · {set ? `${s.answered}/${set.count}` : s.answered} answered{block && s.answered < block.target && ` · ${block.target - s.answered} to finish this block`}
          {mode === "smart" && <> · <Link href="/practice/custom" className="underline">Customize practice</Link></>}
        </span>
        <div className="flex items-center gap-1">
          <FocusToggle />
          {s.phase === "answering" && s.limitS && <Countdown key={s.q.id} limitS={s.limitS} />}
          <Button variant="ghost" size="sm" aria-label="Bookmark" aria-pressed={bookmarked} onClick={async () => {
            const res = await toggleBookmark({ questionId: s.q.id })
              .catch(() => ({ ok: false as const, error: "Couldn't save the bookmark. Check your connection and try again." }));
            if (!res.ok) { toast.error(res.error); return; }
            setBookmarked(res.data.bookmarked);
            toast(res.data.bookmarked ? "Bookmarked" : "Bookmark removed");
          }}><Bookmark className={bookmarked ? "fill-current" : undefined} /></Button>
          <ReportQuestion questionId={s.q.id} />
        </div>
      </div>

      <QuestionView key={s.q.id} question={s.q} value={s.value} disabled={s.phase === "revealed" || pending}
        onChange={(v) => dispatch({ type: "select", value: v })} correct={correctChoice} />

      {s.phase === "answering" && (
        <div ref={confidenceRef} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-start gap-2">
            <TutorPanel key={s.q.id} questionId={s.q.id} answered={false} />
            {true && <DesmosToggle className="h-64" />}
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
        <div ref={resultRef} className="flex flex-col gap-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={cn("font-semibold", r.correct ? "text-emerald-700" : "text-red-700")}>
              {r.correct ? "✓ Correct" : `✗ Not quite${"accepted" in r.revealed.answer ? `. The accepted answer is ${r.revealed.answer.accepted.join(" or ")}` : ""}`}
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
            <Button size="lg" onClick={next}>{set && s.answered >= set.count ? "See summary" : "Next"}</Button>
            {!r.correct && !(set && s.answered >= set.count) && (
              <Button size="lg" variant="outline" onClick={() => { similarTo.current = s.q.id; next(); }}>Try a similar question</Button>
            )}
            <TutorPanel key={s.q.id} questionId={s.q.id} answered wrongChoice={!r.correct && !!s.q.choices?.length ? s.value : null} />
          </div>
        </div>
      )}
    </div>
  );
}

function Explanation({ q }: { q: RevealedQuestion }) {
  const tabs = [
    { id: "hand", label: "By hand", md: q.explanationMd },
    q.desmos && { id: "desmos", label: "GeoGebra", md: q.desmos.stepsMd },
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
      {cur.md ? <Markdown className="text-sm">{cur.md}</Markdown> : <p className="text-sm text-muted-foreground">A worked explanation is not included in this question&apos;s source. You can review the correct answer above or ask the tutor.</p>}
      {cur.id === "desmos" && q.desmos && <DesmosCalculator expressions={q.desmos.expressions} className="h-72" />}
    </div>
  );
}
