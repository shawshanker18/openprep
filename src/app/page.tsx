import Link from 'next/link';
import { ArrowRight, BookOpen, ChartNoAxesCombined, Check, ClipboardCheck, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/markdown';
export const dynamic='force-dynamic';
const features=[
  {icon:Compass,title:'Find your starting point',body:'An optional diagnostic samples Math and Reading and Writing skills. Review your wrong answers when you are ready, with your selection and the correct answer side by side.'},
  {icon:BookOpen,title:'Practice what you need',body:'Recommended Practice adjusts difficulty after each answer. Or choose multiple topics and difficulties in the Question Bank, preview questions, and start your own set.'},
  {icon:ClipboardCheck,title:'Get used to test day',body:'Take a full SAT-style test with timed, adaptive modules, or a short test in one subject. Use the SAT Desmos calculator and review answers after the test.'},
  {icon:ChartNoAxesCombined,title:'See your progress',body:'Follow a daily plan, track skills and score estimates, revisit mistakes, and resume saved sessions. Start from scratch lessons stay available for every topic.'},
];
export default function Landing(){
  return <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,#f5f5f5_0%,transparent_50%)] dark:bg-none">
    <div className="mx-auto max-w-6xl px-5">
      <header className="flex items-center justify-between border-b py-6"><Link href="/" className="text-xl font-semibold tracking-tight">OpenPrep<span className="text-neutral-600">.</span></Link><div className="flex items-center gap-5 text-sm"><a href="#features" className="hidden hover:underline sm:inline">How it works</a><Link href="/login" className="font-medium hover:underline">Sign in</Link></div></header>
      <section className="grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
        <div><p className="mb-5 text-sm font-semibold tracking-wide text-neutral-700 dark:text-neutral-400">FREE SAT PREPARATION</p><h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Know what to practice.<br/><span className="text-neutral-700 dark:text-neutral-400">See yourself improve.</span></h1><p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">OpenPrep helps students prepare for SAT Math and Reading and Writing with questions, lessons, timed tests, and a study plan built around their goals.</p><Button size="lg" className="mt-7 h-12 rounded-xl px-6" render={<Link href="/login"/>}>Get started free <ArrowRight/></Button><p className="mt-3 text-sm text-muted-foreground">Set a target score. Choose your schedule. Start at your level.</p></div>
        <div aria-label="Sample practice question" className="rounded-2xl border bg-background p-6 shadow-xl shadow-neutral-900/5 sm:p-8"><div className="mb-6 flex items-center justify-between text-sm"><span className="font-medium">A little practice, every day</span><span className="rounded-full bg-neutral-50 px-3 py-1 text-xs text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">Sample question</span></div><Markdown>{String.raw`Which values of $x$ satisfy $x^2-5x+6=0$?`}</Markdown><div className="mt-5 flex flex-col gap-3">{['1 and 2','2 and 3','3 and 4'].map((answer,i)=><div key={answer} className={`flex items-center gap-3 rounded-xl border p-3 ${i===1?'border-neutral-600 bg-neutral-50 dark:bg-neutral-950':''}`}><span className="flex size-7 items-center justify-center rounded-full border text-sm">{'ABC'[i]}</span><span className="text-sm">{answer}</span>{i===1&&<Check className="ml-auto size-4 text-neutral-700"/>}</div>)}</div><div className="mt-5 border-t pt-4 text-sm"><p className="mb-2 font-medium text-neutral-700 dark:text-neutral-400">Understand the answer</p><Markdown>{String.raw`Factor into $(x-2)(x-3)=0$. Either factor can be zero, so $x=2$ or $x=3$.`}</Markdown></div></div>
      </section>
      <section id="features" className="scroll-mt-6 border-t py-12"><h2 className="mb-8 text-2xl font-semibold tracking-tight">A clear path from your first question to test day.</h2><div className="grid gap-5 sm:grid-cols-2">{features.map(({icon:Icon,title,body})=><article key={title} className="rounded-xl border bg-background p-6"><Icon className="mb-4 size-6 text-neutral-700 dark:text-neutral-400"/><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p></article>)}</div></section>
      <footer className="flex flex-wrap gap-5 border-t py-8 text-sm text-muted-foreground"><Link className="hover:underline" href="/about">How score estimates work</Link><Link className="hover:underline" href="/privacy">Privacy</Link><Link className="hover:underline" href="/terms">Terms</Link></footer>
    </div>
  </main>;
}
