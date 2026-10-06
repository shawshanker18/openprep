import { publicStats } from "@/server/public-stats";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";


const STEPS = [
  { title: "Optional diagnostic", body: "Answer a short set of Math and Reading and Writing questions to find skills to work on. Open your mistakes when you are ready, and revisit them later." },
  { title: "Practice", body: "Use recommended questions based on your answers, or build a practice set in the Question Bank. Choose skills, SAT difficulty, and length; preview questions before starting." },
  { title: "Tests", body: "Take a full SAT-style test with timed, adaptive modules, or a short practice test in one subject. Review your answers after finishing." },
  { title: "Track progress", body: "Your saved answers update your skill progress and score estimate. Resume sessions, revisit mistakes, and see your practice and test history." },
];

// Static: signed-in visitors are sent to /dashboard by the proxy before this is served.
export default async function Landing() {
  const stats = await publicStats().catch(() => null);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-4 py-16">
      <section className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">Prepare for the SAT with OpenPrep.</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Free practice for students preparing for SAT Math and Reading and Writing.
          Set your target score and study schedule, then follow a daily plan.
        </p>
        <div><Button size="lg" render={<Link href="/login" />}>Get started</Button></div>
      </section>
      <section className="grid gap-6 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <div key={s.title}>
            <div className="text-sm text-muted-foreground">{i + 1}</div>
            <h2 className="font-medium">{s.title}</h2>
            {stats && <section aria-label="OpenPrep usage" className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[[stats.users,'All-time users'],[stats.active,'Active users · 30 days'],[stats.answered,'Questions answered'],[stats.tests,'Tests completed']].map(([n,label])=><div key={label}><strong className="text-xl tabular-nums">{Number(n).toLocaleString()}</strong><p className="text-sm text-muted-foreground">{label}</p></div>)}</section>}
      <p className="text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </section>
      {stats && <section aria-label="OpenPrep usage" className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[[stats.users,'All-time users'],[stats.active,'Active users · 30 days'],[stats.answered,'Questions answered'],[stats.tests,'Tests completed']].map(([n,label])=><div key={label}><strong className="text-xl tabular-nums">{Number(n).toLocaleString()}</strong><p className="text-sm text-muted-foreground">{label}</p></div>)}</section>}
      <p className="text-sm text-muted-foreground">
        <Link className="underline" href="/about">How estimates work</Link> · <Link className="underline" href="/privacy">Privacy</Link> ·{" "}
        <Link className="underline" href="/terms">Terms</Link>
      </p>
    </main>
  );
}
