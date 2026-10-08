import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { SurveyForm } from "./survey-form";
import { ThemePrompt } from "@/components/theme-prompt";

export const metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const { profile } = await requireUser();
  // Only the short survey remains; once it is saved the student goes straight to the app.
  if (profile.onboardingStep !== "survey" && profile.onboardingStep !== "self") redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <ThemePrompt />
      <SurveyForm />
    </main>
  );
}
