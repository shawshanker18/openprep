"use client";

import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Markdown } from "@/components/markdown";

type Mode = "hint" | "explain" | "byhand" | "fast" | "desmos" | "why_wrong" | "chat";
type Msg = { role: "user" | "assistant"; content: string };

const LABEL: Record<Exclude<Mode, "chat">, string> = {
  hint: "Give me a hint", explain: "Explain it differently", byhand: "Show every step", fast: "Fastest SAT method",
  desmos: "Solve it with Desmos", why_wrong: "Why is my answer wrong?",
};

/** Slide-over AI tutor for one question (spec 04 §8). `answered=false` → hint mode only. */
export function TutorPanel({ questionId, answered, isMath, wrongChoice }: {
  questionId: string; answered: boolean; isMath: boolean; wrongChoice?: string | null;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const ask = async (mode: Mode, text?: string) => {
    const userMsg: Msg = { role: "user", content: text ?? LABEL[mode as Exclude<Mode, "chat">] };
    const history = [...msgs, userMsg].filter((m) => m.content);
    setMsgs([...msgs, userMsg, { role: "assistant", content: "" }]);
    setBusy(true);
    abort.current = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "content-type": "application/json" }, signal: abort.current.signal,
        body: JSON.stringify({ questionId, mode, choice: mode === "why_wrong" ? wrongChoice : undefined, messages: mode === "chat" ? history : [] }),
      });
      if (!res.body) throw new Error();
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let out = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        out += value;
        setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: out }]);
      }
    } catch {
      setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: "Something went wrong — try again in a moment." }]);
    } finally { setBusy(false); }
  };

  const modes: Exclude<Mode, "chat">[] = !answered ? ["hint"]
    : ["explain", "byhand", "fast", ...(isMath ? ["desmos" as const] : []), ...(wrongChoice ? ["why_wrong" as const] : [])];

  return (
    <Sheet onOpenChange={(open) => { if (!open) abort.current?.abort(); }}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}><Sparkles /> {answered ? "Ask tutor" : "Hint"}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader><SheetTitle>Tutor</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4">
          <div className="flex flex-wrap gap-1.5">
            {modes.map((m) => <Button key={m} size="sm" variant="secondary" disabled={busy} onClick={() => ask(m)}>{LABEL[m]}</Button>)}
          </div>
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "self-end rounded-lg bg-muted px-3 py-2 text-sm" : "text-sm"}>
              {m.role === "assistant" ? (m.content ? <Markdown>{m.content}</Markdown> : <span className="text-muted-foreground">Thinking…</span>) : m.content}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Answers come from an AI and can be wrong; the written explanation is reviewed by people. Don&apos;t share personal details here.</p>
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
