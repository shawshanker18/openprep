import Link from "next/link";
import { Button } from "@/components/ui/button";

const STEPS = [
  { title: "Diagnose", body: "A short adaptive diagnostic finds your real starting point in all 29 SAT skills." },
  { title: "Practise what matters", body: "Every question is chosen for you: the skills with the most points left to gain, at the right difficulty." },
  { title: "Test and track", body: "Full adaptive mocks, mistake review, and an honest score estimate that tightens as you go." },
];

// Static: signed-in visitors are sent to /dashboard by the proxy before this is served.
export default function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-4 py-16">
      <section className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">SAT prep that starts where you are.</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Tell us your target and how much time you have. OpenPrep works out what you know, then gives you the next best
          thing to study. Free and open source.
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
