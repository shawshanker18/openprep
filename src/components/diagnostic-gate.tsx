import { Button } from "@/components/ui/button";
import { beginDiagnostic } from "@/app/onboarding/actions";

/** Optional diagnostic suggestion; the surrounding page stays available. */
export function DiagnosticSuggestion() {
  return (
    <section className="flex flex-col gap-3 rounded-xl border p-5">
      <h2 className="text-sm font-medium text-muted-foreground">Optional: find your starting point</h2>
      <p className="text-sm">
        Start practicing now, or take a short diagnostic to help personalize your starting level.
        Your practice answers also improve your plan. Up to 24 questions, about 25 minutes, no timer.
      </p>
      <form action={beginDiagnostic}><Button type="submit">Start the diagnostic</Button></form>
    </section>
  );
}
