"use client";

import { Markdown } from "@/components/markdown";
import { QuestionView } from "@/components/question-view";
import { TutorPanel } from "@/components/tutor-panel";
import type { RevealedQuestion } from "@/server/questions";

export function ReviewItem({ n, q, response, correct, timeMs, initiallyOpen }: {
  n: number; q: RevealedQuestion; response: string | null; correct: boolean; attemptId: string | null; mistakeType: string | null; timeMs: number; initiallyOpen?: boolean;
}) {
  const s = Math.round(timeMs / 1000);
  const choice = "choice" in q.answer ? q.answer.choice : null;
  const rationale = !correct && response ? q.choiceRationales?.[response] : null;
  return (
    <details id={`q-${n}`} open={initiallyOpen ?? !correct} className="scroll-mt-4 rounded-lg border">
      <summary className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm">
        <span className="w-6 tabular-nums text-muted-foreground">{n}</span>
        <span className={correct ? "text-emerald-700" : "text-red-700"}>{correct ? "✓ Correct" : response ? "✗ Incorrect" : "Not answered"}</span>
        <span className="ml-auto tabular-nums text-muted-foreground" title="Time on this question">
          {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
        </span>
      </summary>
      <div className="flex flex-col gap-4 border-t p-4">
        <p className="text-sm">Your answer: <b>{response ?? "Not answered"}</b> · Correct answer: <b>{choice ?? ("accepted" in q.answer ? q.answer.accepted.join(" or ") : "")}</b></p>
        <QuestionView question={q} value={response} onChange={() => {}} disabled correct={choice} />
        {!choice && "accepted" in q.answer && <p className="text-sm">Accepted answer: <b>{q.answer.accepted.join(" or ")}</b></p>}
        {rationale && <Markdown className="text-sm">{`**Why ${response} is wrong:** ${rationale}`}</Markdown>}
        {q.explanationMd ? <Markdown className="text-sm">{`**Why:** ${q.explanationMd}`}</Markdown> : !rationale && <p className="text-sm text-muted-foreground">A written explanation is not available for this question yet.</p>}
        {q.fastMethodMd && <Markdown className="text-sm text-muted-foreground">{`**Fastest:** ${q.fastMethodMd}`}</Markdown>}
        <div><TutorPanel questionId={q.id} answered wrongChoice={!correct && !!q.choices?.length ? response : null} /></div>

      </div>
    </details>
  );
}
