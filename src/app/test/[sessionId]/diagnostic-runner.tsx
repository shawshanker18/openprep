"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QuestionView } from "@/components/question-view";
import { DIAGNOSTIC_LENGTH } from "@/engine/diagnostic";
import type { PublicQuestion } from "@/server/questions";
import { answerDiagnostic } from "./actions";

/** One question at a time, no feedback, no going back (spec 04 §5.2 item 5). */
export function DiagnosticRunner({ sessionId, initial, initialIndex }: {
  sessionId: string; initial: PublicQuestion; initialIndex: number;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [index, setIndex] = useState(initialIndex);
  const [value, setValue] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = performance.now(); }, [q.id]);

  const submit = (response: string | null) => start(async () => {
    const res = await answerDiagnostic({ sessionId, questionId: q.id, response, timeMs: Math.round(performance.now() - shownAt.current) });
    if (!res.ok) { toast.error(res.error); router.refresh(); return; }
    if (res.data.done) { router.push(`/test/${sessionId}/results`); return; }
    setQ(res.data.question); setIndex(res.data.index); setValue(null);
    window.scrollTo({ top: 0 });
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Diagnostic</span>
        <span>Question {index + 1} of up to {DIAGNOSTIC_LENGTH}</span>
      </div>
      <div className="h-1 overflow-hidden rounded bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${(100 * index) / DIAGNOSTIC_LENGTH}%` }} />
      </div>
      <QuestionView key={q.id} question={q} value={value} onChange={setValue} disabled={pending} />
      <div className="flex gap-2">
        <Button size="lg" disabled={pending || value === null} onClick={() => submit(value)}>Next</Button>
        <Button size="lg" variant="ghost" disabled={pending} onClick={() => submit(null)}>I don&apos;t know</Button>
      </div>
    </div>
  );
}
