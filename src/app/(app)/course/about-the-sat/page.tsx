import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Markdown } from "@/components/markdown";

export const metadata = { title: "About the SAT" };

// Original OpenPrep writing. Facts reflect the digital SAT format.
const MD = `
## What the SAT is

The SAT is a college admissions test. It has two sections, **Reading and Writing** and **Math**, and you take it on a laptop or tablet in the Bluebook app at a test center.

Each section is scored from 200 to 800, so your total is between 400 and 1600. Colleges see both section scores and the total.

## How the test is laid out

| Section | Modules | Questions | Time |
|---|---|---|---|
| Reading and Writing | 2 | 27 per module, 54 total | 32 minutes per module |
| Math | 2 | 22 per module, 44 total | 35 minutes per module |

There is a 10 minute break between the two sections. All together the test takes about 2 hours and 14 minutes.

## Why the second module matters

The SAT is adaptive by module. How you do on the first module of a section decides whether your second module is the easier one or the harder one. The harder second module is the only way to reach the top scores, so your first-module answers affect the second module.

Inside a module you can move back and forth, flag questions, and change answers until time runs out.

## The kinds of questions

**Reading and Writing** questions each have one short passage (sometimes two, or a table or chart) and one question. They test four areas: Information and Ideas, Craft and Structure, Expression of Ideas, and Standard English Conventions. That's exactly how the units in this course are organized.

**Math** is mostly multiple choice, but about a quarter of the questions ask you to type your own answer. The four areas are Algebra, Advanced Math, Problem Solving and Data Analysis, and Geometry and Trigonometry.

## Tools you get on test day

The SAT includes a Desmos graphing calculator for the Math section and a reference sheet with common formulas. OpenPrep also includes Desmos calculator lessons.

## Timing and answers

- **There is no penalty for wrong answers.** Never leave a question blank. If you're stuck, make your best guess, flag it, and come back if you have time.
- **Don't get stuck.** Five minutes on one hard question can cost you two easier ones later in the module. Guess, flag it, and move on.
- **Pace yourself.** Reading and Writing gives you about 71 seconds per question, and Math about 95 seconds.

## How to use this course

1. **Start with a lesson or practice.** The diagnostic is optional if you want a starting-level check; your practice answers also help personalize your plan.
2. **Work through the units.** For each skill, read the lesson, look at the two worked examples, then practice. Your level for the skill goes from Not started to Attempted, Familiar, Proficient and finally Mastered.
3. **Take the quizzes and unit tests.** They mix skills together like the real test and raise your levels faster.
4. **Try the course challenge** when you've worked through the units, to check every skill at once.
5. **Take full practice tests** on the Tests page to practice pacing and stamina for the real thing.

Your study plan on the Home page already picks the skills worth the most points for you, so you can follow it day by day and use the course whenever you want to go deeper on a topic.
`;

export default function AboutTheSat() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/course" className="text-sm text-muted-foreground hover:text-foreground">SAT course</Link>
        <h1 className="text-2xl font-semibold">Unit 1: About the SAT</h1>
        <p className="text-sm text-muted-foreground">A five minute read before you start.</p>
      </div>
      <article className="max-w-2xl"><Markdown>{MD}</Markdown></article>
      <div className="flex flex-wrap gap-3">
        <Link href="/course?section=math" className="flex items-center gap-1 rounded-lg border px-4 py-2 text-sm hover:bg-muted">Start SAT Math <ChevronRight className="size-4" /></Link>
        <Link href="/course?section=rw" className="flex items-center gap-1 rounded-lg border px-4 py-2 text-sm hover:bg-muted">Start Reading and Writing <ChevronRight className="size-4" /></Link>
      </div>
    </div>
  );
}
