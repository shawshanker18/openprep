"use client";
import { Markdown } from '@/components/markdown';
import { QuestionView } from '@/components/question-view';
import type { RevealedQuestion } from '@/server/questions';
export function ReviewItem({n,q,response,correct,timeMs,initiallyOpen}: {
  n:number;q:RevealedQuestion;response:string|null;correct:boolean;attemptId:string|null;mistakeType:string|null;timeMs:number;initiallyOpen?:boolean;
}) {
  const seconds=Math.round(timeMs/1000);
  const choice='choice' in q.answer?q.answer.choice:null;
  const correctAnswer=choice??('accepted' in q.answer?q.answer.accepted.join(' or '):'');
  const selectedText=q.choices?.find(c=>c.id===response)?.md;
  const correctText=q.choices?.find(c=>c.id===choice)?.md;
  const wrongReason=!correct&&response?q.choiceRationales?.[response]:null;
  const correctReason=choice?q.choiceRationales?.[choice]:null;
  return <details id={`q-${n}`} open={initiallyOpen??!correct} className="scroll-mt-4 rounded-xl border">
    <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm"><span className="tabular-nums text-muted-foreground">Question {n}</span><span className={correct?'text-neutral-700':'text-red-700'}>{correct?'✓ Correct':response?'✗ Incorrect':'Not answered'}</span><span className="ml-auto tabular-nums text-muted-foreground">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</span></summary>
    <div className="grid gap-6 border-t p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <QuestionView question={q} value={response} onChange={()=>{}} disabled correct={choice} compact/>
      <aside aria-label="Answer analysis" className="flex min-w-0 flex-col gap-4 rounded-lg bg-muted/40 p-4">
        <section><h3 className="text-sm font-semibold">Your answer: {response??'Not answered'}</h3>{selectedText&&<Markdown className="mt-2 text-sm">{selectedText}</Markdown>}</section>
        <section className="border-t pt-4"><h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-400">Correct answer: {correctAnswer}</h3>{correctText&&<Markdown className="mt-2 text-sm">{correctText}</Markdown>}</section>
        {(q.explanationMd||correctReason)&&<section className="border-t pt-4"><h3 className="mb-2 text-sm font-semibold">Why the correct answer works</h3><Markdown className="text-sm">{q.explanationMd||correctReason!}</Markdown></section>}
        {wrongReason&&<section><h3 className="mb-2 text-sm font-semibold">Why your answer was wrong</h3><Markdown className="text-sm">{wrongReason}</Markdown></section>}
        {!q.explanationMd&&!correctReason&&!wrongReason&&<p className="border-t pt-4 text-sm text-muted-foreground">The correct answer is shown above. This question&apos;s source does not include a written explanation.</p>}
        {q.fastMethodMd&&<details><summary className="cursor-pointer text-sm">Another way to solve it</summary><Markdown className="mt-2 text-sm">{q.fastMethodMd}</Markdown></details>}
      </aside>
    </div>
  </details>;
}
