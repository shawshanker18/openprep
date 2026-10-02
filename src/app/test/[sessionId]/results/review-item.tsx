"use client";

import { useState } from "react";
import { Markdown } from "@/components/markdown";
import { QuestionView } from "@/components/question-view";
import { TutorPanel } from "@/components/tutor-panel";
import { MISTAKE_LABEL, MISTAKE_TYPES } from "@/engine/mistakes";
import { cn } from "@/lib/utils";
import type { RevealedQuestion } from "@/server/questions";
import { setMistakeType } from "@/app/(app)/practice/actions";
import { TARGET_SECONDS } from "@/engine/constants";

export function ReviewItem({ n, q, response, correct, attemptId, mistakeType, timeMs }: {
  n: number; q: RevealedQuestion; response: string | null; correct: boolean; attemptId: string | null; mistakeType: string | null; timeMs: number;
}) {
  const s = Math.round(timeMs / 1000);
  const slow = s > 1.5 * TARGET_SECONDS[q.section as "rw" | "math"];
  const [mistake, setMistake] = useState(mistakeType);
  const choice = "choice" in q.answer ? q.answer.choice : null;
  const rationale = !correct && response ? q.choiceRationales?.[response] : null;
  return (
    <details id={`q-${n}`} className="scroll-mt-4 rounded-lg border">
      <summary className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm">
        <span className="w-6 tabular-nums text-muted-foreground">{n}</span>
        <span className={correct ? "text-emerald-700" : "text-red-700"}>{correct ? "✓ Correct" : response ? "✗ Incorrect" : "Not answered"}</span>
        <span className="ml-auto tabular-nums text-muted-foreground" title={slow ? "Longer than one and a half times the SAT pace" : "Time on this question"}>
          {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}{slow ? " · slow" : ""}
        </span>
      </summary>
      <div className="flex flex-col gap-4 border-t p-4">
        <QuestionView question={q} value={response} onChange={() => {}} disabled correct={choice} />
        {!choice && "accepted" in q.answer && <p className="text-sm">Accepted answer: <b>{q.answer.accepted.join(" or ")}</b></p>}
        {rationale && <p className="text-sm"><b>Why {response} is wrong:</b> {rationale}</p>}
        <Markdown className="text-sm">{q.explanationMd}</Markdown>
        {q.fastMethodMd && <Markdown className="text-sm text-muted-foreground">{`**Fastest:** ${q.fastMethodMd}`}</Markdown>}
        <div><TutorPanel questionId={q.id} answered isMath={q.section === "math"} wrongChoice={!correct && q.type === "mcq" ? response : null} /></div>
        {!correct && attemptId && (
          <div className="flex flex-wrap gap-1.5">
            {MISTAKE_TYPES.map((m) => (
              <button key={m} type="button" aria-pressed={mistake === m}
                onClick={async () => { setMistake(m); await setMistakeType({ attemptId, type: m }); }}
                className={cn("rounded-full border px-3 py-1 text-xs", mistake === m ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{MISTAKE_LABEL[m]}</button>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
