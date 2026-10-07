"use client";
import {useSyncExternalStore} from "react";
import {QuestionView} from "@/components/question-view";
import {Markdown} from "@/components/markdown";
import {GUEST_QUESTIONS} from "./questions";
import {readGuestAnswers,subscribeGuest,guestSnapshot} from "./state";
export function GuestReview({mistakesOnly=false}:{mistakesOnly?:boolean}){const raw=useSyncExternalStore(subscribeGuest,guestSnapshot,()=> '{}');const answers=readGuestAnswers(raw);const answered=GUEST_QUESTIONS.filter(q=>answers[q.id]);const qs=mistakesOnly?answered.filter(q=>answers[q.id]!==q.correct):answered;return <div className="flex flex-col gap-4">{qs.length?qs.map(q=><section key={q.id} className="rounded-xl border p-4"><QuestionView question={q} value={answers[q.id]??null} onChange={()=>{}} disabled correct={q.correct} showMetadata={false} compact/><p className="my-2 text-sm">Your answer: {answers[q.id]} · Correct answer: {q.correct}</p><Markdown>{q.explanation}</Markdown></section>):<p>{mistakesOnly?'No mistakes to review yet.':'Answer a question to see your progress here.'}</p>}</div>}
