import Link from 'next/link';
import { ArrowRight, BookOpen, Check, ChevronDown, Sparkles, GraduationCap, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/markdown';
import { BrandLogo } from '@/components/brand';

export const metadata = { alternates: { canonical: '/' } };

const faqs = [
  {
    q: 'What is OpenPrep?',
    a: 'OpenPrep is a free SAT prep platform with adaptive practice, over 13,000 SAT Math and Reading and Writing questions, full-length practice tests, free lessons and a personal study plan.',
  },
  {
    q: 'Is OpenPrep good SAT prep for CBSE students?',
    a: 'OpenPrep is free and works alongside CBSE maths. Tick the CBSE maths chapters you have finished in Classes 9 to 12 and OpenPrep marks the matching SAT Math skills as likely covered in school. Read more at openprep.site/cbse-sat-prep.',
  },
  {
    q: 'Is OpenPrep free?',
    a: 'Yes. OpenPrep is completely free to use. There is no subscription, no paywalls, and there are no ads.',
  },
  {
    q: 'How many SAT practice questions does OpenPrep have?',
    a: 'Over 13,000 SAT questions across Math and Reading and Writing. Filter them by topic and difficulty in the Question Bank, or let Adaptive Practice choose for you.',
  },
  {
    q: 'Does OpenPrep have full-length SAT practice tests?',
    a: 'Yes. Take a full SAT-style test with timed, adaptive modules, or a short test in one subject. The SAT Desmos calculator is built in, and you can review every answer afterwards.',
  },
  {
    q: 'What is adaptive SAT practice?',
    a: 'Adaptive Practice adjusts the difficulty of your questions after each answer, so you spend your time on questions at the right level for you.',
  },
  {
    q: 'Does OpenPrep have free SAT lessons?',
    a: 'Yes. Every SAT Math and Reading and Writing skill has a free lesson with key ideas, formulas, worked examples and common traps. Browse them all at openprep.site/learn.',
  },
];

const FAQ_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}).replace(/</g, '\\u003c');

const steps = [
  {
    num: '01',
    title: 'Find your starting point',
    body: 'An optional diagnostic samples Math and Reading & Writing skills. Review wrong answers side-by-side with explanations to locate gaps immediately.',
  },
  {
    num: '02',
    title: 'Adaptive Practice',
    body: 'Questions calibrate to your ability in real time. Or curate custom question sets in the Question Bank by domain, skill, and difficulty.',
  },
  {
    num: '03',
    title: 'Get used to test day',
    body: 'Full-length, timed SAT practice tests with an embedded Desmos calculator replicate the authentic Digital SAT testing experience.',
  },
  {
    num: '04',
    title: 'Track your growth',
    body: 'Review detailed accuracy analytics, pacing metrics, mistake logs, and score estimate trajectories toward your target score.',
  },
];

export default function Landing() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Navigation Header */}
        <header className="flex items-center justify-between border-b border-border/60 py-4 sm:py-5">
          <Link href="/" aria-label="OpenPrep" className="transition-opacity hover:opacity-85">
            <BrandLogo height={28} />
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <a href="#how-it-works" className="hidden font-medium text-muted-foreground hover:text-foreground sm:inline transition-colors">
              How it works
            </a>
            <Link href="/sat-practice-tests" className="hidden font-medium text-muted-foreground hover:text-foreground sm:inline transition-colors">
              Practice tests
            </Link>
            <Link href="/cbse-sat-prep" className="hidden font-medium text-muted-foreground hover:text-foreground sm:inline transition-colors">
              CBSE SAT prep
            </Link>
            <Link href="/learn" className="hidden font-medium text-muted-foreground hover:text-foreground sm:inline transition-colors">
              Free SAT lessons
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
            >
              Continue to OpenPrep
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="grid items-center gap-10 py-12 md:grid-cols-2 md:gap-14 md:py-16">
          <div className="flex flex-col items-start">
            <div className="inline-flex items-center gap-2 rounded-md border border-border/80 bg-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              <Sparkles className="size-3.5 text-foreground" />
              <span>Free SAT Preparation</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[3.25rem] leading-[1.1]">
              Know what to practice.<br />
              <span className="text-muted-foreground">See yourself improve.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              OpenPrep helps students prepare for SAT Math and Reading & Writing with over 13,000 questions, lessons, timed tests, and a study plan tailored to your target score.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Button size="lg" className="h-12 rounded-lg px-7 font-medium shadow-sm" render={<Link href="/login" />}>
                Get started free <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Set a target score. Choose your schedule. Start at your level. No credit card required.
            </p>
          </div>

          {/* Interactive Question Card */}
          <div
            aria-label="Sample practice question"
            className="rounded-2xl border border-border/80 bg-card p-6 shadow-xl shadow-neutral-900/5 sm:p-7"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-foreground">A little practice, every day</span>
              <span className="rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Sample question
              </span>
            </div>
            <div className="text-base text-foreground font-medium">
              <Markdown>{String.raw`Which values of $x$ satisfy $x^2-5x+6=0$?`}</Markdown>
            </div>
            <div className="mt-5 flex flex-col gap-2.5">
              {['1 and 2', '2 and 3', '3 and 4'].map((answer, i) => (
                <div
                  key={answer}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-sm transition-all ${
                    i === 1
                      ? 'border-foreground/30 bg-muted/60 font-medium'
                      : 'border-border/70 hover:bg-muted/30'
                  }`}
                >
                  <span className={`flex size-7 items-center justify-center rounded-md border text-xs font-semibold ${i === 1 ? 'border-foreground/40 bg-background' : 'border-border'}`}>
                    {'ABC'[i]}
                  </span>
                  <span>{answer}</span>
                  {i === 1 && <Check className="ml-auto size-4 text-foreground" />}
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-border/60 pt-4 text-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Understand the answer</p>
              <div className="text-muted-foreground">
                <Markdown>{String.raw`Factor into $(x-2)(x-3)=0$. Either factor can be zero, so $x=2$ or $x=3$.`}</Markdown>
              </div>
            </div>
          </div>
        </section>

        {/* Path / How it Works (No cards redesign) */}
        <section id="how-it-works" className="scroll-mt-8 border-t border-border/60 py-16">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">The Method</span>
            <h2 className="mt-1 text-3xl font-bold tracking-tight">A clear path from your first question to test day.</h2>
            <p className="mt-3 text-muted-foreground">
              A structured progression designed to identify weaknesses quickly and build genuine test mastery.
            </p>
          </div>

          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ num, title, body }) => (
              <div key={num} className="group relative flex flex-col border-t-2 border-border/80 pt-6 transition-colors hover:border-foreground">
                <span className="text-xs font-mono font-bold tracking-wider text-muted-foreground group-hover:text-foreground">
                  {num}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-foreground tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Highlight Sections (CBSE & Lessons) */}
        <section className="border-t border-border/60 py-16">
          <div className="grid gap-8 md:grid-cols-2">
            {/* CBSE Card */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-muted/20 p-8 transition-all hover:bg-muted/30">
              <div>
                <div className="inline-flex size-11 items-center justify-center rounded-xl bg-background border border-border shadow-2xs mb-5">
                  <School className="size-5 text-foreground" />
                </div>
                <div className="inline-block rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground ml-3">
                  Class 9–12
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">SAT prep for CBSE students</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Tick the CBSE maths chapters you have completed in Classes 9 to 12. OpenPrep marks the SAT Math skills they overlap with as likely covered in school, so you can zero in on what is new.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/40">
                <Link
                  href="/cbse-sat-prep"
                  className="inline-flex items-center text-sm font-semibold text-foreground hover:underline gap-1.5"
                >
                  See how OpenPrep works for CBSE <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            {/* Free Lessons Card */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-muted/20 p-8 transition-all hover:bg-muted/30">
              <div>
                <div className="inline-flex size-11 items-center justify-center rounded-xl bg-background border border-border shadow-2xs mb-5">
                  <BookOpen className="size-5 text-foreground" />
                </div>
                <div className="inline-block rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground ml-3">
                  Comprehensive
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">Free SAT lessons for every skill</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Key ideas, formulas, worked examples and the traps that cost points, for every SAT Math and Reading & Writing skill. Read the theory, study worked examples, then jump straight into practice.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/40">
                <Link
                  href="/learn"
                  className="inline-flex items-center text-sm font-semibold text-foreground hover:underline gap-1.5"
                >
                  Browse all free SAT lessons <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section id="faq" className="scroll-mt-8 border-t border-border/60 py-16">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Answers</span>
            <h2 className="mt-1 text-3xl font-bold tracking-tight">OpenPrep questions, answered</h2>
            <p className="mt-2 text-sm text-muted-foreground">Everything you need to know about the platform and our free prep tools.</p>
          </div>

          <div className="divide-y divide-border/60 rounded-2xl border border-border/80 bg-card overflow-hidden">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group p-5 sm:p-6 cursor-pointer">
                <summary className="flex items-center justify-between list-none font-semibold text-foreground hover:text-foreground/80 transition-colors">
                  <span className="pr-4">{q}</span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground pl-0 pr-6">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_LD }} />

        {/* Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-border/60 py-10 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-6">
            <Link className="hover:text-foreground transition-colors" href="/sat-math">SAT Math</Link>
            <Link className="hover:text-foreground transition-colors" href="/sat-reading-writing">SAT Reading & Writing</Link>
            <Link className="hover:text-foreground transition-colors" href="/sat-practice-tests">SAT practice tests</Link>
            <Link className="hover:text-foreground transition-colors" href="/cbse-sat-prep">CBSE SAT prep</Link>
            <Link className="hover:text-foreground transition-colors" href="/learn">Free SAT lessons</Link>
            <Link className="hover:text-foreground transition-colors" href="/about">How score estimates work</Link>
            <Link className="hover:text-foreground transition-colors" href="/privacy">Privacy</Link>
            <Link className="hover:text-foreground transition-colors" href="/terms">Terms</Link>
          </div>
          <p className="text-xs text-muted-foreground">© OpenPrep. Free for all students.</p>
        </footer>
      </div>
    </main>
  );
}
