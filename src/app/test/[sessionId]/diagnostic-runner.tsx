"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ExamFooter, ExamFrame, ExamTop } from "@/components/exam-frame";
import { QuestionView } from "@/components/question-view";
import { DIAGNOSTIC_LENGTH } from "@/engine/diagnostic";
import type { PublicQuestion } from "@/server/questions";
import { answerDiagnostic, endDiagnostic } from "./actions";
import { EndTest } from "./end-test";
import { DesmosDock } from "@/components/desmos-panel";

/** One question at a time, no feedback, no going back (spec 04 §5.2 item 5). */
export function DiagnosticRunner({ sessionId, initial, initialIndex, studentName }: {
  sessionId: string; initial: PublicQuestion; initialIndex: number; studentName?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [index, setIndex] = useState(initialIndex);
  const [value, setValue] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = performance.now(); }, [q.id]);

  const submit = (response: string | null, confidence: 1 | 2 | 3 | null = null) => start(async () => {
    const res = await answerDiagnostic({ sessionId, questionId: q.id, response, confidence, timeMs: Math.round(performance.now() - shownAt.current) })
      .catch(() => ({ ok: false as const, error: "Couldn't save your answer. Your selection is still here. Check your connection and try again." }));
    if (!res.ok) { toast.error(res.error); return; }
    if (res.data.done) { router.push(`/test/${sessionId}/results`); return; }
    setQ(res.data.question); setIndex(res.data.index); setValue(null);
    window.scrollTo({ top: 0 });
  });

  return (
    <ExamFrame
      top={<ExamTop title="Diagnostic" subtitle={q.section === "rw" ? "Reading and Writing" : "Math"} tools={<>
        {q.section === "math" && <DesmosDock />}
        <EndTest action={endDiagnostic.bind(null, sessionId)} detail="The answers you've given so far are kept. You can take the diagnostic again later from your dashboard." />
      </>} />}
      footer={<ExamFooter name={studentName} label={`Question ${index + 1} of up to ${DIAGNOSTIC_LENGTH}`}
        onNext={() => submit(value)} nextDisabled={pending || value === null} nextLabel={pending ? "Saving…" : "Next"} />}>
      <QuestionView key={q.id} fill question={q} value={value} onChange={setValue} disabled={pending} showMetadata={false} number={index + 1} />
    </ExamFrame>
  );
}
