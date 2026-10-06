import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { beginDiagnostic, skipDiagnostic } from "./actions";
import { SurveyForm } from "./survey-form";

export const metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const { profile } = await requireUser();
  if (profile.onboardingStep === "done") redirect("/dashboard");
  const survey = profile.onboardingStep === "survey" || profile.onboardingStep === "self";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      {survey ? <SurveyForm /> : <>
        <div>
          <h1 className="text-2xl font-semibold">Optional: find your starting point</h1>
          <p className="text-muted-foreground">Up to 24 questions, about 25 minutes, no timer. It&apos;s fine not to know. Use “I don&apos;t know” instead of guessing.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <form action={beginDiagnostic}><Button size="lg" type="submit">Start the diagnostic</Button></form>
          <form action={skipDiagnostic}><Button size="lg" variant="outline" type="submit">Start practicing</Button></form>
        </div>
        <p className="text-sm text-muted-foreground">The diagnostic is optional. Question bank, Recommended Practice, tests and your daily plan are available now.</p>
      </>}
    </main>
  );
}
