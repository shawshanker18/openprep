import Link from "next/link";
import type { Metadata } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.openprep.site";

export const metadata: Metadata = {
  title: "Free SAT practice tests: full-length adaptive tests",
  description: "Free SAT practice tests from OpenPrep (Open Prep): full SAT-style tests with timed, adaptive modules, short one-subject tests, the SAT Desmos calculator and a full answer review afterwards.",
  alternates: { canonical: "/sat-practice-tests" },
};

const faqs = [
  { q: "Are OpenPrep SAT practice tests free?", a: "Yes. OpenPrep is free, with no subscription and no ads." },
  { q: "Are the practice tests adaptive?", a: "Full SAT-style tests use timed, adaptive modules, the way the digital SAT adapts to how you are doing." },
  { q: "Can I take a short test instead of a full one?", a: "Yes. You can take a short test in one subject, Math or Reading and Writing, when you do not have time for a full test." },
  { q: "Is a calculator available in the test?", a: "Yes. The SAT Desmos calculator is available while you practise, and you can review your answers after the test." },
  { q: "Are the score estimates official?", a: "No. Estimates come from practice data and a simple model, and they are not official scores. The College Board's real scoring is different and not public." },
];

export default function SatPracticeTests() {
  const ld = [
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "OpenPrep", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "SAT practice tests", item: `${SITE}/sat-practice-tests` },
    ] },
  ];
  return (<>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
    <h1>Free SAT practice tests</h1>
    <p>OpenPrep (also written Open Prep) gives you free SAT practice tests that feel like test day: full SAT-style tests with timed, adaptive modules, or a short test in one subject when you are short on time. Use the SAT Desmos calculator while you work, then review every answer afterwards.</p>
    <p><Link className="font-medium underline" href="/login">Take a free SAT practice test</Link></p>
    <h2>What you get</h2>
    <ul>
      <li>Full SAT-style tests with timed, adaptive modules.</li>
      <li>Short tests in a single subject, Math or Reading and Writing.</li>
      <li>The SAT Desmos calculator, so you practise with the tool you will use.</li>
      <li>Answer review after the test, so every mistake becomes a lesson.</li>
      <li>A personal study plan and score estimates that update as you practise.</li>
    </ul>
    <h2>Before and after a practice test</h2>
    <p>Not sure where to start? Begin with the optional diagnostic, which samples Math and Reading and Writing skills, then follow your study plan. After a test, open the <Link className="underline" href="/sat-math">SAT Math</Link> or <Link className="underline" href="/sat-reading-writing">SAT Reading and Writing</Link> lessons for the skills that cost you points, and practise them with adaptive questions.</p>
    <p>Preparing alongside CBSE boards? See <Link className="underline" href="/cbse-sat-prep">SAT prep for CBSE students</Link>.</p>
    <h2>SAT practice test questions, answered</h2>
    {faqs.map(({ q, a }) => (<div key={q}><p className="font-medium">{q}</p><p>{a}</p></div>))}
  </>);
}
