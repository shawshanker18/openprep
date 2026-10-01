import { Button } from "@/components/ui/button";
import { beginDiagnostic } from "@/app/onboarding/actions";

/** Shown in place of practice/tests/plan while the diagnostic is skipped. */
export function DiagnosticGate() {
  return (
    <section className="flex flex-col gap-3 rounded-xl border p-5">
      <h2 className="text-sm font-medium text-muted-foreground">Take your diagnostic first</h2>
      <p className="text-sm">
        Practice, tests and your daily plan unlock after the diagnostic — it&apos;s how OpenPrep finds your starting
        point. Up to 24 questions, about 25 minutes, no timer.
      </p>
      <form action={beginDiagnostic}><Button type="submit">Start the diagnostic</Button></form>
    </section>
  );
}
