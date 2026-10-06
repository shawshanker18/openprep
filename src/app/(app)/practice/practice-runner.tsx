"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { QuestionView } from "@/components/question-view";
import { DesmosCalculator, DesmosToggle } from "@/components/desmos-panel";
import { TutorPanel } from "@/components/tutor-panel";
import { FocusToggle } from "@/components/focus-toggle";
import { cn, isTyping } from "@/lib/utils";
import type { PublicQuestion, RevealedQuestion } from "@/server/questions";
import { toggleBookmark } from "./actions";
import { ReportQuestion } from "./report-question";
import { readDraft, writeDraft } from "@/lib/answer-drafts";

import { loadSavedPractice, saveSavedPractice, answerSavedPractice } from "./session-actions";

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
  | { type: "hydrate"; state:State }
  | { type: "restore"; progress:Base }
  | { type: "loaded"; q: PublicQuestion; limitS: number | null; value?:string|null } | { type: "done" } | { type: "select"; value: string | null }
  | { type: "revealed"; r: Result; timeMs: number } | { type: "mistake"; m: string } | { type: "next" } | { type: "failed"; error: string };

const base = (s: State): Base => ({ seen: s.seen, answered: s.answered, correct: s.correct, ms: s.ms });
function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "hydrate": return a.state;
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

const elapsedMs = (since: number, hidden: number, pausedAt:number|null=null) => {
  const now=performance.now();
  return Math.round(now-since-hidden-(pausedAt===null?0:now-pausedAt));
};
const CONFIDENCE = [{ v: 1, label: "Guessed" }, { v: 2, label: "Unsure" }, { v: 3, label: "Sure" }] as const;
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/** Per-question countdown at SAT pace. Runs into overtime rather than cutting the student off. */
function Countdown({ limitS, elapsedS = 0 }: { limitS: number; elapsedS?:number }) {
  const [left, setLeft] = useState(limitS-elapsedS);
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => setLeft(limitS - elapsedS - (performance.now() - t0) / 1000), 1000);
    return () => clearInterval(id);
  }, [limitS,elapsedS]);
  return <span className={cn("tabular-nums", left <= 0 && "text-red-700")}>{left > 0 ? clock(left) : `Time's up +${clock(-left)}`}</span>;
}

export function PracticeRunner({ sessionId, userId, mode, title, block, set, back }: {
  sessionId: string; userId: string; mode: Mode; title: string; block?: { index: number; target: number } | null;
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
  const router = useRouter();
  const [position,setPosition] = useState(0);
  const [positions,setPositions] = useState<{position:number;attempted:boolean}[]>([]);
  const [saveStatus,setSaveStatus] = useState("Saved to your account");
  const carriedMs = useRef(0);
  const [savedTimeMs,setSavedTimeMs] = useState(0);
  const draftKey = `openprep:practice:${userId}:${sessionId}`;
  const load = useCallback(async (kind:"resume"|"next"|"jump"="resume",at?:number) => {
    const sim=similarTo.current;similarTo.current=null;
    const res=await loadSavedPractice({sessionId,kind,position:at,similar:!!sim})
      .catch(()=>({ok:false as const,error:"Couldn't load your session. Check your connection and try again."}));
    if(!res.ok) {dispatch({type:"failed",error:res.error});return;}
    const data=res.data;
    setPosition(data.position);setPositions(data.items);
    const progress={seen:[],answered:data.answered,correct:data.correct,ms:data.ms};
    if(data.done) {dispatch({type:"hydrate",state:{phase:"done",...progress}});return;}
    const local=readDraft(draftKey).find(d=>d.id===data.question.id);
    const value=data.result?data.response:local?.response??data.response;
    setSaveStatus(data.result || value===data.response?"Saved to your account":"Saving…");
    const common={...progress,q:data.question,value,limitS:data.timeLimitS};
    dispatch({type:"hydrate",state:data.result?{...common,phase:"revealed",r:data.result,mistake:data.result.mistakeGuess}:{...common,phase:"answering"}});
    setBookmarked(data.bookmarked);carriedMs.current=data.timeMs;setSavedTimeMs(data.timeMs);
    shownAt.current=performance.now();hiddenMs.current=0;hiddenSince.current=null;
  },[sessionId,draftKey]);
  useEffect(()=>{start(async()=>{await load();});},[load]);

  const save = useCallback(async () => {
    if(s.phase!=="answering") return true;
    setSaveStatus("Saving…");
    const res=await saveSavedPractice({sessionId,position,response:s.value,timeMs:Math.min(86400_000,carriedMs.current+elapsedMs(shownAt.current,hiddenMs.current,hiddenSince.current))})
      .catch(()=>({ok:false as const,error:"Couldn't save. Your answer is kept on this device; try again."}));
    if(res.ok) {
      const local=readDraft(draftKey)[0];
      if(local?.id===s.q.id && local.response===s.value) writeDraft(draftKey,[]);
    }
    setSaveStatus(res.ok?"Saved to your account":"Not saved online — retry before leaving");
    return res.ok;
  },[sessionId,position,s,draftKey]);
  useEffect(()=>{
    if(s.phase!=="answering") return;
    writeDraft(draftKey,[{id:s.q.id,position,response:s.value,flagged:false,timeMs:0}]);
    const timer=setTimeout(()=>{void save();},800);
    const interval=setInterval(()=>{if(!document.hidden) void save();},10000);
    return ()=>{clearTimeout(timer);clearInterval(interval);};
  },[s,position,draftKey,save]);
  useEffect(()=>{if(s.phase==="revealed") writeDraft(draftKey,[]);},[s.phase,draftKey]);
  const navigate = useCallback((kind:"next"|"jump",at:number) => start(async()=>{
    if(!(await save())) {toast.error("Save failed. Check your connection and try again.");return;}
    await load(kind,at);
  }),[save,load]);
  const next = useCallback(()=>navigate("next",position),[navigate,position]);
  useEffect(()=>{
    const leave=(event:BeforeUnloadEvent)=>{if(s.phase==="answering" && saveStatus!=="Saved to your account"){event.preventDefault();event.returnValue="";}};
    window.addEventListener("beforeunload",leave);
    return ()=>window.removeEventListener("beforeunload",leave);
  },[s.phase,saveStatus]);

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
    const timeMs = Math.min(86400_000,carriedMs.current + elapsedMs(shownAt.current, hiddenMs.current,hiddenSince.current));
    start(async () => {
      const res = await answerSavedPractice({ sessionId, position, response: s.value, timeMs, confidence })
        .catch(() => ({ ok: false as const, error: "Couldn't submit your answer. Your selection is still here. Check your connection and try again." }));
      if (!res.ok) toast.error(res.error);
      else { writeDraft(draftKey,[]); await load(); }
    });
  };

  // Keyboard: 1–4 / A–D choose, Enter = next after reveal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pending || isTyping(e) || e.metaKey || e.ctrlKey) return;
      if (s.phase === "answering" && !!s.q.choices?.length) {
        const i = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
        if (i >= 0) {setSaveStatus("Saving…");dispatch({ type: "select", value: "ABCD"[i]! });}
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
        <Button variant="outline" onClick={() => start(async()=>{await load();})}>Try again</Button>
        <Link href="/practice/sessions" className="text-sm underline">Saved sessions</Link>
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
        <QuestionPositions positions={positions} current={position} target={set?.count??100} pending={pending} onJump={at=>navigate("jump",at)} />
        <p className="text-sm text-muted-foreground">{positions.filter(p=>!p.attempted).length} reached questions are still unattempted. You can return to them above.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/practice/sessions" />}>Saved sessions</Button>
          {back ? <Button render={<Link href={back} />}>{back.startsWith("/question-bank") ? "Back to the question bank" : back.startsWith('/bookmarks')?'Back to saved questions':"Back to the course"}</Button> : <Button render={<Link href="/practice" />}>Recommended practice</Button>}
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
  const correctChoice = r && "choice" in r.revealed.answer ? r.revealed.answer.choice : null;
  const rationale = r && !r.correct && s.value ? r.revealed.choiceRationales?.[s.value] : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span role="status">{saveStatus}</span>
        <Button variant="outline" disabled={pending} onClick={()=>start(async()=>{if(await save()) router.push("/practice/sessions");else toast.error("Couldn't save. Please try again.");})}>Save and leave</Button>
      </div>
      <QuestionPositions positions={positions} current={position} target={set?.count??100} pending={pending} onJump={at=>navigate("jump",at)} />
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {title} · {s.q.section === "rw" ? "Reading and Writing" : "Math"} · {set ? `${s.answered}/${set.count}` : s.answered} answered{block && s.answered < block.target && ` · ${block.target - s.answered} to finish this block`}
          {mode === "smart" && <> · <Link href="/question-bank" className="underline">Choose questions</Link></>}
        </span>
        <div className="flex items-center gap-1">
          <FocusToggle />
          {s.phase === "answering" && s.limitS && <Countdown key={s.q.id} limitS={s.limitS} elapsedS={savedTimeMs/1000} />}
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
        onChange={(v) => {setSaveStatus("Saving…");dispatch({ type: "select", value: v });}} correct={correctChoice} />

      {s.phase === "answering" && (
        <div ref={confidenceRef} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-start gap-2">
            <TutorPanel key={s.q.id} questionId={s.q.id} answered={false} />
            {s.q.section === "math" && <DesmosToggle />}
          </div>
          <Button variant="outline" className="self-start" disabled={pending} onClick={next}>Next question</Button>
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
          <p className="text-sm">Your answer: <b>{s.value ?? "Not answered"}</b> · Correct answer: <b>{"choice" in r.revealed.answer ? r.revealed.answer.choice : r.revealed.answer.accepted.join(" or ")}</b></p>
          {rationale && <Markdown className="text-sm">{`**Why ${s.value} is wrong:** ${rationale}`}</Markdown>}
          <Explanation q={r.revealed} />
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
      {cur.md ? <Markdown className="text-sm">{cur.md}</Markdown> : <p className="text-sm text-muted-foreground">A worked explanation is not included in this question&apos;s source. You can review the correct answer above or ask the tutor.</p>}
      {cur.id === "desmos" && q.desmos && <DesmosCalculator expressions={q.desmos.expressions} className="h-[65vh]" />}
    </div>
  );
}

function QuestionPositions({positions,current,target,pending,onJump}:{positions:{position:number;attempted:boolean}[];current:number;target:number;pending:boolean;onJump:(at:number)=>void}) {
  return <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Question pane · Question {Math.min(current+1,target)} of {target}</summary><p className="my-2 text-xs text-muted-foreground">Select any opened question to return to it. ✓ Answered · ○ Unanswered</p><nav aria-label="Session questions" className="flex flex-wrap gap-2">
    {positions.map(p=><button key={p.position} type="button" disabled={pending} aria-current={p.position===current?"step":undefined}
      onClick={()=>onJump(p.position)} className={cn("rounded-md border px-2 py-1 text-sm",p.position===current&&"bg-muted font-semibold")}
      aria-label={`Question ${p.position+1}, ${p.attempted?"attempted":"unattempted"}`}>
      {p.position+1} {p.attempted?"✓":"○"}
    </button>)}
  </nav></details>;
}
