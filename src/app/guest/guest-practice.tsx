"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { QuestionView } from "@/components/question-view";
import { DesmosToggle } from "@/components/desmos-panel";
import { GUEST_QUESTIONS } from "./questions";
const KEY="openprep:guest:v1";
export function GuestPractice() {
  const [section,setSection]=useState<"math"|"rw">("math");
  const [position,setPosition]=useState(0);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [value,setValue]=useState<string|null>(null);
  const [storageWarning,setStorageWarning]=useState(false);
  useEffect(()=>{let live=true;try{const raw=JSON.parse(localStorage.getItem(KEY)??"{}");const safe=Object.fromEntries(GUEST_QUESTIONS.filter(q=>typeof raw[q.id]==="string" && q.choices?.some(c=>c.id===raw[q.id])).map(q=>[q.id,raw[q.id]]));queueMicrotask(()=>{if(live)setAnswers(safe);});}catch{queueMicrotask(()=>{if(live)setStorageWarning(true);});}return()=>{live=false;};},[]);
  const qs=GUEST_QUESTIONS.filter(q=>q.section===section),q=qs[position]!;
  const response=answers[q.id];
  const correct=GUEST_QUESTIONS.filter(q=>answers[q.id]===q.correct).length;
  const answered=Object.keys(answers).length;
  const move=(n:number)=>{setPosition(n);setValue(null);};
  return <main className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="text-xl font-semibold">OpenPrep</Link><Button variant="outline" render={<Link href="/login"/>}>Sign in to save progress</Button></header>
    <div><h1 className="text-2xl font-semibold">Guest practice</h1><p className="mt-1 text-sm text-muted-foreground">Try 12 sample questions without an account. Answers stay on this browser; account progress, the full bank and timed tests require sign-in.</p></div>
    {storageWarning&&<p role="status" className="text-sm">Browser storage is unavailable. Your guest answers will last only while this page is open.</p>}
    <div className="flex flex-wrap items-center gap-3"><label className="text-sm">Subject <select aria-label="Subject" value={section} onChange={e=>{setSection(e.target.value as "math"|"rw");move(0);}} className="ml-2 rounded-lg border bg-background p-2"><option value="math">Math</option><option value="rw">Reading and Writing</option></select></label><span className="text-sm tabular-nums">{correct}/{answered} correct</span></div>
    <nav aria-label="Questions" className="flex flex-wrap gap-2">{qs.map((x,i)=><Button key={x.id} size="sm" variant={position===i?"default":"outline"} aria-current={position===i?"step":undefined} onClick={()=>move(i)}>{i+1}{answers[x.id]?" ✓":""}</Button>)}</nav>
    <p className="text-sm">Question {position+1} of {qs.length}</p>
    {section==="math"&&<DesmosToggle/>}
    <QuestionView question={q} value={response??value} onChange={setValue} disabled={!!response} correct={response?q.correct:null} showMetadata={false}/>
    {!response?<Button className="self-start" disabled={!value} onClick={()=>{if(!value)return;const next={...answers,[q.id]:value};setAnswers(next);try{localStorage.setItem(KEY,JSON.stringify(next));}catch{setStorageWarning(true);}}}>Submit answer</Button>:<section className="flex flex-col gap-2 rounded-xl border p-4"><h2 className="font-semibold">{response===q.correct?"Correct":"Incorrect"}</h2><p className="text-sm">Your answer: {response} · Correct answer: {q.correct}</p><Markdown>{q.explanation}</Markdown></section>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={position===0} onClick={()=>move(position-1)}>Back</Button><Button disabled={position===qs.length-1} onClick={()=>move(position+1)}>Next question</Button>{position===qs.length-1&&<Button variant="outline" render={<Link href="/login"/>}>Continue with an account</Button>}</div>
  </main>;
}
