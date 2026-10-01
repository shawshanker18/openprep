import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { beginDiagnostic, skipDiagnostic } from "./actions";
import { SelfAssessment } from "./self-assessment";
import { SurveyForm } from "./survey-form";

export const metadata = { title: "Get started" };

const STEPS = { survey: 1, self: 2, diagnostic: 3 } as const;

export default async function OnboardingPage() {
  const { profile } = await requireUser();
  if (profile.onboardingStep === "done") redirect("/dashboard");
  const step = (profile.onboardingStep === "diagnostic_skipped" ? "diagnostic" : profile.onboardingStep) as keyof typeof STEPS;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-sm text-muted-foreground">Step {STEPS[step]} of 3</p>
        <h1 className="text-2xl font-semibold">
          {step === "survey" && "Tell us about you"}
          {step === "self" && "What do you already know?"}
          {step === "diagnostic" && "Find your starting point"}
        </h1>
        <p className="text-muted-foreground">
          {step === "survey" && "About a minute. Everything can be changed later in Settings."}
          {step === "self" && "Your honest guess is enough, because the diagnostic checks it next. Skip anything you're unsure about."}
          {step === "diagnostic" && "Up to 24 questions, about 25 minutes, no timer. It's fine not to know. Use “I don't know” instead of guessing."}
        </p>
      </div>
      {step === "survey" && <SurveyForm />}
      {step === "self" && <SelfAssessment />}
      {step === "diagnostic" && (<>
        <div className="flex flex-col gap-3 sm:flex-row">
          <form action={beginDiagnostic}><Button size="lg" type="submit">Start the diagnostic</Button></form>
          {profile.onboardingStep === "diagnostic" && (
            <form action={skipDiagnostic}><Button size="lg" variant="outline" type="submit">Skip for now</Button></form>
          )}
        </div>
        {profile.onboardingStep === "diagnostic" && (
          <p className="text-sm text-muted-foreground">You can look around first, but practice, tests and your plan unlock only after the diagnostic.</p>
        )}
      </>)}
    </main>
  );
}
