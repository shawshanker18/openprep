"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Markdown } from "@/components/markdown";

type Mode = "hint" | "explain" | "byhand" | "fast" | "desmos" | "why_wrong" | "vocab" | "similar" | "chat";
type Msg = { role: "user" | "assistant"; content: string };

const LABEL: Record<Exclude<Mode, "chat">, string> = {
  hint: "Give me a hint", explain: "Explain it differently", byhand: "Show every step", fast: "Fastest SAT method",
  desmos: "Solve it with Desmos", why_wrong: "Why is my answer wrong?",
  vocab: "Explain the vocabulary/grammar", similar: "Give me a similar question",
};

// One check per page load: is a tutor model configured on this server?
let enabledCheck: Promise<boolean> | null = null;
const tutorEnabled = () => (enabledCheck ??= fetch("/api/chat").then((r) => { if (!r.ok) throw new Error("Tutor availability check failed"); return r.json(); }).then((j: { enabled?: boolean }) => !!j.enabled).catch((error) => { enabledCheck = null; throw error; }));

/** Slide-over AI tutor for one question (spec 04 §8). `answered=false` → hint mode only. */
export function TutorPanel({ questionId, answered, wrongChoice }: {
  questionId: string; answered: boolean; wrongChoice?: string | null;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [checkAttempt, setCheckAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    const check = () => { void tutorEnabled().then((value) => { if (alive) { setEnabled(value); setCheckFailed(false); } }).catch(() => { if (alive) setCheckFailed(true); }); };
    check(); window.addEventListener("online", check);
    return () => { alive = false; window.removeEventListener("online", check); abort.current?.abort(); };
  }, [checkAttempt]);

  const ask = async (mode: Mode, text?: string) => {
    if(busy)return;
    const userMsg: Msg = { role: "user", content: text ?? LABEL[mode as Exclude<Mode, "chat">] };
    const history = [...msgs, userMsg].filter((m) => m.content);
    setMsgs([...msgs, userMsg, { role: "assistant", content: "" }]);
    setError(null); setBusy(true);
    abort.current = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "content-type": "application/json" }, signal: abort.current.signal,
        body: JSON.stringify({ questionId, mode, choice: mode === "why_wrong" ? wrongChoice : undefined, messages: mode === "chat" ? history : [] }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "The tutor is temporarily unavailable.");
      }
      if (!res.body) throw new Error("The tutor returned an empty response.");
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let out = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        out += value;
        setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: out }]);
      }
    } catch (error) {
      if (abort.current?.signal.aborted) return;
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again in a moment.";
      setMsgs((m) => m.slice(0, -1)); setError(message);
    } finally { setBusy(false); }
  };

  const modes: Exclude<Mode, "chat">[] = !answered ? ["hint"]
    : ["explain", "byhand", "fast", ...(wrongChoice ? ["why_wrong" as const] : []), "similar"];

  if (!enabled) return checkFailed ? <Button variant="outline" size="sm" onClick={() => { setCheckFailed(false); setCheckAttempt((n) => n + 1); }}>Retry tutor connection</Button> : null;
  return (
    <Sheet onOpenChange={(open) => { if (!open) abort.current?.abort(); }}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}><Sparkles /> {answered ? "Ask tutor" : "Hint"}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader><SheetTitle>Tutor</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4">
          <div className="flex flex-wrap gap-1.5">
            {modes.map((m) => <Button key={m} size="sm" variant="secondary" disabled={busy} onClick={() => ask(m)}>{LABEL[m]}</Button>)}
          </div>
          {error && <p role="alert" className="rounded-md border p-3 text-sm">Tutor unavailable: {error} Try again when your connection is working.</p>}
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "self-end rounded-lg bg-muted px-3 py-2 text-sm" : "text-sm"}>
              {m.role === "assistant" ? (m.content ? <Markdown>{m.content}</Markdown> : <span className="text-muted-foreground">Thinking…</span>) : m.content}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Answers come from an AI and can be wrong; check important steps yourself. Don&apos;t share personal details here.</p>
        </div>
        {answered && (
          <form className="flex gap-2 border-t p-4" onSubmit={(e) => { e.preventDefault(); const t = input.trim(); if (t) { setInput(""); void ask("chat", t); } }}>
            <input value={input} maxLength={1000} onChange={(e) => setInput(e.target.value)} placeholder="Ask a follow-up…" aria-label="Ask the tutor"
              className="h-9 flex-1 rounded-md border bg-background px-3 text-sm" />
            <Button type="submit" size="sm" disabled={busy || !input.trim()}>Send</Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
