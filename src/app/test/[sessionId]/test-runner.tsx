"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionView } from "@/components/question-view";
import { ReferenceSheet } from "@/components/reference-sheet";
import { DesmosToggle } from "@/components/desmos-panel";
import { cn, isTyping } from "@/lib/utils";
import type { PublicQuestion } from "@/server/questions";
import { abandon, reportFocusLoss, saveResponse, startModule, submitModule } from "./actions";
import { EndTest, useTestLockdown } from "./lockdown";

type Item = { position: number; question: PublicQuestion; response: string | null; flagged: boolean };
type Mod = { id: string; idx: number; section: string; route: string; timeLimitS: number | null; startedAt: string | null; deadlineAt: string | null; adaptive: boolean };

const SECTION = { rw: "Reading and Writing", math: "Math", mixed: "Mixed practice" } as Record<string, string>;
const now = () => performance.now();
const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

export function TestRunner({ sessionId, module: m, items: initial, serverNow, breakBefore, heading }: {
  sessionId: string; module: Mod; items: Item[]; serverNow: string; breakBefore: boolean; heading?: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [pos, setPos] = useState(0);
  const [screen, setScreen] = useState<"break" | "intro" | "question" | "review">(m.startedAt ? "question" : breakBefore ? "break" : "intro");
  const [left, setLeft] = useState<number | null>(null);
  const [showTimer, setShowTimer] = useState(true);
  const [saving, setSaving] = useState<"saved" | "saving" | "error">("saved");
  // Explicit flags, not a transition: a slow page refresh must never block answering.
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // Per-question time, flushed with each save.
  const enteredAt = useRef(0);
  const acc = useRef<Record<number, number>>({});
  const accrue = useCallback(() => {
    const t = now();
    if (enteredAt.current) acc.current[pos] = (acc.current[pos] ?? 0) + (t - enteredAt.current);
    enteredAt.current = t;
  }, [pos]);
  useEffect(() => { enteredAt.current = screen === "question" ? now() : 0; }, [screen, pos]);

  // Locked in the apps for the whole test: every module, the break and the intro.
  useTestLockdown(sessionId);

  // While a module runs, leaving the window is counted on the results (everywhere, apps included).
  const running = screen === "question" || screen === "review";
  useEffect(() => {
    if (!running) return;
    let last = 0;
    const lost = () => {
      if (Date.now() - last < 3000) return; // blur + visibilitychange fire together
      last = Date.now();
      void reportFocusLoss(sessionId);
      toast.warning("You left the test window. This is noted on your results.");
    };
    const onVis = () => { if (document.hidden) lost(); };
    window.addEventListener("blur", lost);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("blur", lost); document.removeEventListener("visibilitychange", onVis); };
  }, [running, sessionId]);

  const save = useCallback(async (position: number, it: Item) => {
    const delta = Math.round(acc.current[position] ?? 0);
    acc.current[position] = 0;
    setSaving("saving");
    const res = await saveResponse({ moduleId: m.id, position, response: it.response, flagged: it.flagged, timeMsDelta: delta });
    if (res.ok) setSaving("saved");
    else { acc.current[position] = (acc.current[position] ?? 0) + delta; setSaving("error"); toast.error(res.error); }
  }, [m.id]);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update = (patch: Partial<Item>) => {
    const it = { ...items[pos]!, ...patch };
    setItems((xs) => xs.map((x, i) => (i === pos ? it : x)));
    accrue();
    if (debounce.current) clearTimeout(debounce.current);
    const p = pos;
    debounce.current = setTimeout(() => save(p, it), 400);
  };
  const go = (to: number | "review") => {
    accrue();
    if (debounce.current) { clearTimeout(debounce.current); debounce.current = null; }
    void save(pos, items[pos]!);
    if (to === "review") setScreen("review"); else { setPos(to); setScreen("question"); }
  };

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    if (debounce.current) clearTimeout(debounce.current);
    void submitModule(m.id).then((r) => {
      if (r && typeof r === "object" && r.finished) router.replace(`/test/${sessionId}/results`);
      else router.refresh(); // next module
    });
  }, [m.id, router, sessionId]);

  // Countdown; auto-submit at zero.
  useEffect(() => {
    if (!m.deadlineAt || screen === "intro" || screen === "break") return;
    const tick = () => {
      const remaining = new Date(m.deadlineAt!).getTime() - (offset.current + (now() - loadedAt.current));
      setLeft(remaining);
      if (remaining <= 0) submit();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [m.deadlineAt, screen, submit]);

  // Keyboard: 1–4 / A–D choose, F flags.
  useEffect(() => {
    if (screen !== "question") return;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey) return;
      const it = items[pos]!;
      if (e.key.toLowerCase() === "f") update({ flagged: !it.flagged });
      if (it.question.type === "mcq") {
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
      <div className="mx-auto flex max-w-lg flex-col gap-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">
          {items.length} questions{m.timeLimitS ? ` · ${Math.round(m.timeLimitS / 60)} minutes` : " · untimed"}. You can move between questions and flag
          any to revisit. Answers are revealed after the whole test.
        </p>
        <Button size="lg" className="self-center" disabled={starting} onClick={async () => {
          setStarting(true);
          if (await startModule(m.id)) { setScreen("question"); router.refresh(); } else { toast.error("Couldn't start this module."); setStarting(false); }
        }}>Start</Button>
        <EndTest action={abandon.bind(null, sessionId)} detail="It won't be scored and your answers so far won't count." />
      </div>
    );
  }

  const it = items[pos]!;
  const answered = items.filter((x) => x.response !== null).length;
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background px-4 py-2 text-sm">
        <span className="font-medium">{title}</span>
        {left != null && (
          <button className={cn("tabular-nums", left < 5 * 60_000 && "font-bold")} onClick={() => setShowTimer((v) => !v)} aria-live="off">
            {showTimer ? clock(left) : "Show time"}
          </button>
        )}
        <div className="flex items-center gap-2">
          {(m.section === "math" || m.section === "mixed") && <ReferenceSheet />}
          <span className="text-xs text-muted-foreground">{saving === "saving" ? "Saving…" : saving === "error" ? "Not saved" : "Saved"}</span>
          <EndTest action={abandon.bind(null, sessionId)} detail="It won't be scored and your answers so far won't count." />
        </div>
      </header>

      <div className="flex-1 px-4 py-6">
        {screen === "question" ? (
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="rounded bg-foreground px-2 py-0.5 text-sm text-background tabular-nums">{pos + 1}</span>
              <Button variant={it.flagged ? "secondary" : "ghost"} size="sm" onClick={() => update({ flagged: !it.flagged })} aria-pressed={it.flagged}>
                <Flag className={cn(it.flagged && "fill-current")} /> {it.flagged ? "Flagged" : "Flag for review"}
              </Button>
            </div>
            {it.question.section === "math" && <DesmosToggle />}
            <QuestionView key={it.question.id} question={it.question} value={it.response} onChange={(v) => update({ response: v })} disabled={submitting} />
          </div>
        ) : (
          <div className="mx-auto flex max-w-xl flex-col gap-4">
            <h2 className="text-xl font-semibold">Check your work</h2>
            <p className="text-sm text-muted-foreground">{answered} of {items.length} answered. Select a question to go back to it.</p>
            <Navigator items={items} current={-1} onPick={go} />
            <Button size="lg" className="self-start" disabled={submitting} onClick={submit}>
              {submitting ? "Submitting…" : "Submit module"}
            </Button>
          </div>
        )}
      </div>

      {screen === "question" && (
        <footer className="sticky bottom-0 flex items-center justify-between gap-2 border-t bg-background px-4 py-2">
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-md border px-3 py-1.5 text-sm">Question {pos + 1} of {items.length} ▾</summary>
            <div className="absolute bottom-10 left-0 w-72 rounded-lg border bg-background p-3 shadow-lg">
              <Navigator items={items} current={pos} onPick={go} />
              <Button variant="link" size="sm" onClick={() => go("review")}>Go to review page</Button>
            </div>
          </details>
          <div className="flex gap-2">
            <Button variant="outline" disabled={pos === 0} onClick={() => go(pos - 1)}>Back</Button>
            <Button onClick={() => go(pos + 1 < items.length ? pos + 1 : "review")}>Next</Button>
          </div>
        </footer>
      )}
    </div>
  );
}

function Navigator({ items, current, onPick }: { items: Item[]; current: number; onPick: (i: number) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {items.map((x, i) => (
        <button key={x.position} onClick={() => onPick(i)} aria-label={`Question ${i + 1}${x.response ? ", answered" : ", unanswered"}${x.flagged ? ", flagged" : ""}`}
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
