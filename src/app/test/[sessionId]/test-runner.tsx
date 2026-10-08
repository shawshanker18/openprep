"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExamFooter, ExamFrame, ExamTimer, ExamTop } from "@/components/exam-frame";
import { QuestionView } from "@/components/question-view";
import { ReferenceSheet } from "@/components/reference-sheet";
import { DesmosDock } from "@/components/desmos-panel";
import { cn, isTyping } from "@/lib/utils";
import type { PublicQuestion } from "@/server/questions";
import { abandon, saveResponse, startModule } from "./actions";
import { EndTest } from "./end-test";
import { sendModuleSubmission } from "@/lib/submit-module";
import { readDraft, writeDraft } from "@/lib/answer-drafts";

type Item = { position: number; question: PublicQuestion; response: string | null; flagged: boolean };
type Mod = { id: string; idx: number; section: string; route: string; timeLimitS: number | null; startedAt: string | null; deadlineAt: string | null; adaptive: boolean };

const SECTION = { rw: "Reading and Writing", math: "Math", mixed: "Mixed practice" } as Record<string, string>;
const now = () => performance.now();
const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

export function TestRunner({ userId, sessionId, module: m, items: initial, serverNow, breakBefore, heading, studentName }: {
  userId: string; sessionId: string; module: Mod; items: Item[]; serverNow: string; breakBefore: boolean; heading?: string | null; studentName?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [pos, setPos] = useState(0);
  const [screen, setScreen] = useState<"break" | "intro" | "question" | "review">(m.startedAt ? "question" : breakBefore ? "break" : "intro");
  const [left, setLeft] = useState<number | null>(null);
  // Choices the student has crossed out, by question position. Kept here so they are still crossed out after Back / Next.
  const [crossed, setCrossed] = useState<Record<number, string[]>>({});
  const [saving, setSaving] = useState<"saved" | "saving" | "error">("saved");
  // Explicit flags, not a transition: a slow page refresh must never block answering.
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError,setSubmitError] = useState<string|null>(null);

  // Server-authoritative clock: remaining = deadline − (server time at load + elapsed since load).
  const loadedAt = useRef(0);
  const offset = useRef(0);
  useEffect(() => { loadedAt.current = now(); offset.current = new Date(serverNow).getTime(); }, [serverNow]);
  // performance.now() pauses while a phone or laptop sleeps, so the countdown would show time that's already gone.
  // When the page is visible again, re-render from the server, which brings a fresh serverNow to re-sync from.
  useEffect(() => {
    const resync = () => { if (!document.hidden) router.refresh(); };
    document.addEventListener("visibilitychange", resync);
    return () => document.removeEventListener("visibilitychange", resync);
  }, [router]);
  const submitted = useRef(false);
  const autoRetryAt=useRef(0);

  // Per-question time, flushed with each save.
  const enteredAt = useRef(0);
  const acc = useRef<Record<number, number>>({});
  const accrue = useCallback(() => {
    const t = now();
    if (enteredAt.current) acc.current[pos] = (acc.current[pos] ?? 0) + (t - enteredAt.current);
    enteredAt.current = t;
  }, [pos]);
  useEffect(() => { enteredAt.current = screen === "question" ? now() : 0; }, [screen, pos]);

  // The latest answer for each question the server may not have yet (waiting to save, or a save failed). They are
  // sent again on every move and before submitting, so a network blip never loses one. (Server actions run one at a
  // time, in order, so a newer save can't be overtaken by an older one.)
  const unsaved = useRef(new Map<number, Item>());
  const draftKey = `openprep:unsaved:${userId}:${sessionId}:${m.id}`;
  const persist = useCallback(() => writeDraft(draftKey,[...unsaved.current].map(([position,it])=>({position,id:it.question.id,response:it.response,flagged:it.flagged,timeMs:Math.round(acc.current[position]??0)}))),[draftKey]);
  useEffect(()=>{
    let alive=true;
    queueMicrotask(()=>{
      if(!alive) return;
      const restored=readDraft(draftKey).filter(a=>initial[a.position]?.question.id===a.id);
      if(!restored.length) return;
      const recovered=initial.map((it,position)=>{
        const a=restored.find(a=>a.position===position);
        if(!a) return it;
        const next={...it,response:a.response,flagged:a.flagged};
        unsaved.current.set(position,next);acc.current[position]=a.timeMs;return next;
      });
      setItems(recovered);setSaving('error');toast.info('Recovered unsaved answers. Continue to save them.');
    });
    const beforeLeave=(event:BeforeUnloadEvent)=>{if(unsaved.current.size){persist();event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',beforeLeave);
    return ()=>{alive=false;window.removeEventListener('beforeunload',beforeLeave);};
  },[draftKey,initial,persist]);
  const save = useCallback(async (position: number, it: Item) => {
    const delta = Math.round(acc.current[position] ?? 0);
    acc.current[position] = 0;
    setSaving("saving");
    const res = await saveResponse({ moduleId: m.id, position, response: it.response, flagged: it.flagged, timeMsDelta: delta })
      .catch(() => ({ ok: false as const, error: "Your answer isn't saved yet (no connection). It will be saved when you continue." }));
    if (res.ok) {
      if (unsaved.current.get(position) === it) unsaved.current.delete(position);
      setSaving(unsaved.current.size ? "error" : "saved");
    } else { acc.current[position] = (acc.current[position] ?? 0) + delta; setSaving("error"); toast.error(res.error); }
    persist();
  }, [m.id,persist]);
  const saveAll = useCallback(() => Promise.all([...unsaved.current].map(([p, it]) => save(p, it))), [save]);
  useEffect(()=>{
    const retry=()=>{void saveAll();};
    window.addEventListener('online',retry);
    return ()=>window.removeEventListener('online',retry);
  },[saveAll]);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update = (patch: Partial<Item>) => {
    if(submitted.current || submitting) return;
    const it = { ...items[pos]!, ...patch };
    setItems((xs) => xs.map((x, i) => (i === pos ? it : x)));
    accrue();
    const p = pos;
    unsaved.current.set(p, it);
    if(!persist()) toast.warning('Browser storage is unavailable. Keep this tab open until your answers are saved.');
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { debounce.current = null; void save(p, it); }, 400);
  };
  const go = (to: number | "review") => {
    if(submitted.current || submitting) return;
    accrue();
    if (debounce.current) { clearTimeout(debounce.current); debounce.current = null; }
    if (!unsaved.current.has(pos)) unsaved.current.set(pos, items[pos]!); // sends the time spent on it too
    void saveAll();
    if (to === "review") setScreen("review"); else { setPos(to); setScreen("question"); }
  };

  // `auto`: time ran out. Then it goes ahead whatever happens (the server closes the module anyway); a student's own
  // submit waits until every answer is saved.
  const submit = useCallback(async (auto = false) => {
    if (submitted.current || auto && Date.now()<autoRetryAt.current) return;
    submitted.current = true;
    setSubmitting(true);
    if (screen === "question") {
      accrue();
      if (!unsaved.current.has(pos)) unsaved.current.set(pos, items[pos]!);
    }
    if (debounce.current) { clearTimeout(debounce.current); debounce.current = null; }
    const fail = (msg: string) => {
      submitted.current=false;setSubmitting(false);setSubmitError(msg);
      if(auto){autoRetryAt.current=Date.now()+10_000;setSaving('error');} else toast.error(msg);
    };
    setSubmitError(null);
    const drafts=items.map((it,position)=>({position,response:it.response,flagged:it.flagged,timeMsDelta:Math.round(acc.current[position]??0)}));
    persist();
    try {
      const result=await sendModuleSubmission(m.id,drafts);
      if(!result.ok) return fail(result.error);
      unsaved.current.clear();writeDraft(draftKey,[]);setSaving('saved');
      setSubmitting(false);submitted.current=false;
      if(result.finished) router.replace(`/test/${sessionId}/results`);
      else router.refresh();
    } catch {fail("Submission didn't finish. Your answers are kept on this device. Retry, or reload to check the saved module.");}

  }, [m.id, router, sessionId, screen, accrue, pos, items,draftKey,persist]);

  // Countdown; auto-submit at zero.
  useEffect(() => {
    if (!m.deadlineAt || screen === "intro" || screen === "break") return;
    const tick = () => {
      const remaining = new Date(m.deadlineAt!).getTime() - (offset.current + (now() - loadedAt.current));
      setLeft(remaining);
      if (remaining <= 0) void submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [m.deadlineAt, screen, submit]);

  // Keyboard: 1–4 / A–D choose, F flags.
  useEffect(() => {
    if (screen !== "question") return;
    const onKey = (e: KeyboardEvent) => {
      if (submitted.current || submitting || isTyping(e) || e.metaKey || e.ctrlKey) return;
      const it = items[pos]!;
      if (e.key.toLowerCase() === "f") update({ flagged: !it.flagged });
      if (!!it.question.choices?.length) {
        const i = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
        if (i >= 0) update({ response: "ABCD"[i]! });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Course checks carry their own title ("Algebra: quiz 1"); otherwise name the section and module.
  const title = heading ?? `${SECTION[m.section] ?? m.section}${m.adaptive ? ` · Module ${m.route === "base" ? 1 : 2}` : ""}`;

  if (screen === "break") return <Break onDone={() => setScreen("intro")} />;
  if (screen === "intro") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-8 text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">
          {items.length} questions{m.timeLimitS ? ` · ${Math.round(m.timeLimitS / 60)} minutes` : " · untimed"}. You can move between questions and flag
          any to revisit. Answers are revealed after the whole test.
        </p>
        <Button size="lg" className="self-center" disabled={starting} onClick={async () => {
          setStarting(true);
          try {
            if (await startModule(m.id)) { setScreen("question"); router.refresh(); }
            else toast.error("Couldn't start this module. Please try again.");
          } catch { toast.error("Couldn't start this module. Check your connection and try again."); }
          finally { setStarting(false); }
        }}>Start</Button>
        <EndTest action={abandon.bind(null, sessionId)} detail="It won't be scored and your answers so far won't count." />
      </div>
    );
  }

  const it = items[pos]!;
  const answered = items.filter((x) => x.response !== null).length;
  const isMath = m.section === "math" || m.section === "mixed";
  const top = (
    <ExamTop title={title} subtitle={screen === "review" ? "Check your work" : `${SECTION[m.section] ?? m.section}`}
      center={left != null ? <ExamTimer label={clock(left)} urgent={left < 5 * 60_000} /> : undefined}
      tools={<>
        {isMath && <DesmosDock />}
        {isMath && <ReferenceSheet />}
        <span className="w-16 text-center text-xs text-muted-foreground" role="status">{saving === "saving" ? "Saving…" : saving === "error" ? "Not saved" : "Saved"}</span>
        <EndTest action={abandon.bind(null, sessionId)} detail="It won't be scored and your answers so far won't count." />
      </>} />
  );

  if (screen === "review") {
    return (
      <ExamFrame top={top} footer={<ExamFooter name={studentName} label={`${answered} of ${items.length} answered`} onBack={() => go(items.length - 1)} onNext={() => void submit()} nextLabel={submitting ? "Submitting…" : "Submit module"} nextDisabled={submitting} />}>
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4 py-4">
          <h2 className="text-xl font-semibold">Check your work</h2>
          <p className="text-sm text-muted-foreground">{answered} of {items.length} answered. Select a question to go back to it. You cannot return to this module after you submit.</p>
          <Navigator items={items} current={-1} onPick={go} />
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
        </div>
      </ExamFrame>
    );
  }

  return (
    <ExamFrame top={top} footer={
      <ExamFooter name={studentName} label={`Question ${pos + 1} of ${items.length}`}
        popup={<div><p className="mb-3 text-center text-sm font-semibold">{title}</p><Navigator items={items} current={pos} onPick={go} />
          <button type="button" data-close onClick={() => go("review")} className="mt-3 min-h-10 w-full rounded-full border text-sm font-medium">Go to review page</button></div>}
        onBack={() => go(pos - 1)} backDisabled={pos === 0} onNext={() => go(pos + 1 < items.length ? pos + 1 : "review")} nextLabel={pos + 1 < items.length ? "Next" : "Review"} />}>
      <QuestionView key={it.question.id} fill question={it.question} value={it.response} onChange={(v) => update({ response: v })} disabled={submitting} showMetadata={false}
        number={pos + 1} marked={it.flagged} onMark={() => update({ flagged: !it.flagged })}
        eliminated={crossed[pos] ?? []} onEliminate={(next) => setCrossed((c) => ({ ...c, [pos]: next }))} />
    </ExamFrame>
  );
}

function Navigator({ items, current, onPick }: { items: Item[]; current: number; onPick: (i: number) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {items.map((x, i) => (
        <button key={x.position} data-close onClick={() => onPick(i)} aria-label={`Question ${i + 1}${x.response ? ", answered" : ", unanswered"}${x.flagged ? ", flagged" : ""}`}
          className={cn("relative flex h-8 items-center justify-center rounded border text-xs tabular-nums",
            x.response ? "bg-primary text-primary-foreground" : "border-dashed", i === current && "ring-2 ring-offset-1 ring-primary")}>
          {i + 1}
          {x.flagged && <Flag className="absolute -right-1 -top-1 size-3 fill-red-600 text-red-600" />}
        </button>
      ))}
    </div>
  );
}

function Break({ onDone }: { onDone: () => void }) {
  const [left, setLeft] = useState(10 * 60_000);
  useEffect(() => {
    const end = now() + 10 * 60_000;
    const t = setInterval(() => { const l = end - now(); setLeft(l); if (l <= 0) onDone(); }, 1000);
    return () => clearInterval(t);
  }, [onDone]);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Break</h1>
      <p className="text-5xl tabular-nums">{clock(left)}</p>
      <p className="text-muted-foreground">Reading and Writing is done. Stretch and drink some water. Math starts after the break.</p>
      <Button size="lg" onClick={onDone}>Resume now</Button>
    </div>
  );
}
