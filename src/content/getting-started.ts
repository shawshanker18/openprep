// General SAT orientation: kept out of Maths and English so it reads as "where to begin" for every student.
// The "What the SAT is" lesson is the one that already existed (about-sat.ts) and keeps its completion key.
// Facts follow the digital SAT format; the College Board's SAT Suite pages are the source to check if they change.
import { ABOUT_SAT_MD } from "./about-sat";

export type OrientationLesson = { key: string; title: string; md: string };

export const ORIENTATION: OrientationLesson[] = [
  { key: "about-the-sat", title: "What the SAT is and how it works", md: ABOUT_SAT_MD },
  {
    key: "exam-structure",
    title: "Exam structure",
    md: `The digital SAT has two sections, each split into two timed modules. You get a short break between sections.

| Section | Time | Questions | Modules |
|---|---|---|---|
| Reading and Writing | 64 minutes | 54 | 2 of 32 minutes, 27 questions each |
| Math | 70 minutes | 44 | 2 of 35 minutes, 22 questions each |

**Adaptive modules.** Your second module in each section is harder or easier depending on how you did in the first. Getting the first module right gives you a harder second module, which lets you reach higher scores.

**Calculator.** A built-in graphing calculator is available for the whole Math section. OpenPrep's Desmos lessons show how to use it.

**Pacing.** About 71 seconds per Reading and Writing question and about 95 seconds per Math question. OpenPrep times your answers against these targets on the Analysis page.`,
  },
  {
    key: "scoring",
    title: "How the SAT is scored",
    md: `Each section is scored from 200 to 800, and the total is the two section scores added together, from 400 to 1600.

- **There is no penalty for a wrong answer.** Always answer every question, even if you have to guess.
- **Scores come from the questions you get right,** adjusted for how hard the modules you took were. Two students with the same number of right answers can get different scores if their modules differed in difficulty.
- **Scores are estimates here.** OpenPrep's Progress page shows an estimate from your practice. Only an official SAT result is a real score.

Your target score in OpenPrep is the number you set in Settings. It is a goal to measure progress against, not a prediction.`,
  },
  {
    key: "study-plan",
    title: "Making a study plan",
    md: `A plan works best when it is short, regular and based on what you actually miss.

1. **Pick a test date.** Give yourself at least two months, and leave two weeks before the date for full practice tests.
2. **Set a daily time you can keep.** Thirty to forty-five focused minutes most days beats a long session once a week.
3. **Start with your weakest areas.** Take the diagnostic or Adaptive Practice first, then work on the skills the Analysis page flags.
4. **Mix in full practice tests.** Take one every week or two, under timed conditions, and review every wrong answer.
5. **Review mistakes, not just scores.** Reading the explanation for a wrong answer, and retrying it later, improves results more than doing extra questions.`,
  },
  {
    key: "using-openprep",
    title: "How to use OpenPrep",
    md: `OpenPrep has a few places that do different jobs:

- **Dashboard.** Your plan for today and anything due for review.
- **Adaptive Practice.** Questions chosen for you, based on your answers so far.
- **Question bank.** Search and filter every question yourself, by subject, topic, skill and difficulty.
- **Start from scratch** (this section and the Maths and English tabs). Short lessons in teaching order.
- **Progress.** Your estimated score over time, and your overall mastery by area.
- **Analysis.** How accurate you are, how long you take per question, where your mistakes cluster, and what to practice next.
- **Practice tests.** Full-length and section tests, scored like the real exam.

If you are not sure where to start, open the next lesson in this section, then try a few Adaptive Practice questions.`,
  },
];

export const orientationBy = (key: string) => ORIENTATION.find((l) => l.key === key) ?? null;
