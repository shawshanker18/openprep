import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SKILLS } from "@/content/taxonomy";

const STEPS = [
  { title: "Diagnose", body: `An optional diagnostic estimates your level across ${SKILLS.length} SAT skills.` },
  { title: "Practice", body: "Practice questions selected from your recent answers, or choose a skill in the question bank." },
  { title: "Test and track", body: "Take timed practice tests, review mistakes, and track estimated scores." },
];

// Static: signed-in visitors are sent to /dashboard by the proxy before this is served.
export default function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-4 py-16">
      <section className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">Free SAT practice.</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Practice Math and Reading and Writing, take tests, and review your answers. Set a target score and study schedule
          to get a daily plan.
        </p>
        <div><Button size="lg" render={<Link href="/login" />}>Get started</Button></div>
      </section>
      <section className="grid gap-6 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title}>
            <div className="text-sm text-muted-foreground">{i + 1}</div>
            <h2 className="font-medium">{s.title}</h2>
            <p className="text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </section>
      <p className="text-sm text-muted-foreground">
        <Link className="underline" href="/about">How estimates work</Link> · <Link className="underline" href="/privacy">Privacy</Link> ·{" "}
        <Link className="underline" href="/terms">Terms</Link>
      </p>
    </main>
  );
}
