import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";

// Phase E replaces this with survey → self-assessment → diagnostic (spec 04 §2).
export default async function OnboardingPage() {
  const { profile } = await requireUser();
  if (profile.onboardingStep === "done") redirect("/dashboard");
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Welcome to OpenPrep</h1>
      <p className="text-muted-foreground">Onboarding step: {profile.onboardingStep}</p>
    </main>
  );
}
