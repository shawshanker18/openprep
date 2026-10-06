"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QuestionView } from "@/components/question-view";
import { DIAGNOSTIC_LENGTH } from "@/engine/diagnostic";
import type { PublicQuestion } from "@/server/questions";
import { answerDiagnostic, endDiagnostic } from "./actions";
import { EndTest, useTestLockdown } from "./lockdown";
import { DesmosToggle } from "@/components/desmos-panel";

/** One question at a time, no feedback, no going back (spec 04 §5.2 item 5). */
export function DiagnosticRunner({ sessionId, initial, initialIndex }: {
  sessionId: string; initial: PublicQuestion; initialIndex: number;
}) {
  const router = useRouter();
  useTestLockdown(sessionId);
  const [q, setQ] = useState(initial);
  const [index, setIndex] = useState(initialIndex);
  const [value, setValue] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = performance.now(); }, [q.id]);

  const submit = (response: string | null, confidence: 1 | 2 | 3 | null = null) => start(async () => {
    const res = await answerDiagnostic({ sessionId, questionId: q.id, response, confidence, timeMs: Math.round(performance.now() - shownAt.current) })
      .catch(() => ({ ok: false as const, error: "Couldn't save your answer. Your selection is still here. Check your connection and try again." }));
    if (!res.ok) { toast.error(res.error); router.refresh(); return; }
    if (res.data.done) { router.push(`/test/${sessionId}/results`); return; }
    setQ(res.data.question); setIndex(res.data.index); setValue(null);
    window.scrollTo({ top: 0 });
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Diagnostic · {q.section === "rw" ? "Reading and Writing" : "Math"}</span>
        <span className="flex items-center gap-2">
          Question {index + 1} of up to {DIAGNOSTIC_LENGTH}
          <EndTest action={endDiagnostic.bind(null, sessionId)} detail="The answers you've given so far are kept. You can take the diagnostic again later from your dashboard." />
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${(100 * index) / DIAGNOSTIC_LENGTH}%` }} />
      </div>
      {q.section === "math" && <DesmosToggle />}
      <QuestionView key={q.id} question={q} value={value} onChange={setValue} disabled={pending} />
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">How sure are you? (this submits your answer)</span>
        <div className="flex flex-wrap gap-2">
          {([[1, "Guessed"], [2, "Unsure"], [3, "Sure"]] as const).map(([c, label]) => (
            <Button key={c} size="lg" variant={c === 3 ? "default" : "outline"} disabled={pending || value === null} onClick={() => submit(value, c)}>{label}</Button>
          ))}
          <Button size="lg" variant="ghost" disabled={pending} onClick={() => submit(null)}>I don&apos;t know</Button>
        </div>
      </div>
    </div>
  );
}
