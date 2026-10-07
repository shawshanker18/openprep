"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { QuestionView } from "@/components/question-view";
import { DesmosToggle } from "@/components/desmos-panel";
import { GUEST_QUESTIONS } from "./questions";
import {GUEST_LIMIT,guestSnapshot,subscribeGuest,readGuestAnswers,submitGuestAnswer} from "./state";
export function GuestPractice() {
  const [section,setSection]=useState<"math"|"rw">("math");
  const [position,setPosition]=useState(0);
  const [value,setValue]=useState<string|null>(null);
  const raw=useSyncExternalStore(subscribeGuest,guestSnapshot,()=> '{}');
  const answers=readGuestAnswers(raw);
  const qs=GUEST_QUESTIONS.filter(q=>q.section===section),q=qs[position]!;
  const response=answers[q.id];
  const correct=GUEST_QUESTIONS.filter(q=>answers[q.id]===q.correct).length;
  const answered=Object.keys(answers).length;
  const move=(n:number)=>{setPosition(n);setValue(null);};
  return <div className="flex min-w-0 flex-col gap-5">
    <p className="text-sm text-muted-foreground">Try up to 10 questions across both subjects. Your answers stay in this browser.</p>
    {answered>=GUEST_LIMIT&&<section role="status" className="rounded-xl border p-4"><h2 className="font-semibold">You’ve completed your 10 guest questions</h2><p className="my-2 text-sm">Keep exploring lessons and reviewing answers, or continue with Google or email to keep practicing.</p><Link className="underline" href="/login">Continue to OpenPrep</Link></section>}
    <div className="flex flex-wrap items-center gap-3"><label className="text-sm">Subject <select aria-label="Subject" value={section} onChange={e=>{setSection(e.target.value as "math"|"rw");move(0);}} className="ml-2 rounded-lg border bg-background p-2"><option value="math">Math</option><option value="rw">Reading and Writing</option></select></label><span className="text-sm tabular-nums">{correct}/{answered} correct</span></div>
    <nav aria-label="Questions" className="flex flex-wrap gap-2">{qs.map((x,i)=><Button key={x.id} size="sm" variant={position===i?"default":"outline"} aria-current={position===i?"step":undefined} onClick={()=>move(i)}>{i+1}{answers[x.id]?" ✓":""}</Button>)}</nav>
    <p className="text-sm">Question {position+1} of {qs.length}</p>
    {section==="math"&&<DesmosToggle/>}
    <QuestionView question={q} value={response??value} onChange={setValue} disabled={!!response||answered>=GUEST_LIMIT} correct={response?q.correct:null} showMetadata={false}/>
    {!response?<Button className="self-start" disabled={!value||answered>=GUEST_LIMIT} onClick={()=>{if(value)submitGuestAnswer(q.id,value);}}>Submit answer</Button>:<section className="flex flex-col gap-2 rounded-xl border p-4"><h2 className="font-semibold">{response===q.correct?"Correct":"Incorrect"}</h2><p className="text-sm">Your answer: {response} · Correct answer: {q.correct}</p><Markdown>{q.explanation}</Markdown></section>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={position===0} onClick={()=>move(position-1)}>Back</Button><Button disabled={position===qs.length-1} onClick={()=>move(position+1)}>Next question</Button>{position===qs.length-1&&<Button variant="outline" render={<Link href="/login"/>}>Continue with an account</Button>}</div>
  </div>;
}
