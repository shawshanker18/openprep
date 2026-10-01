import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";

/** Current user id from a verified JWT, or null. One auth round-trip per request. */
export const getUserId = cache(async (): Promise<string | null> => {
  // Local-only stub so flows can be exercised without a real sign-in. Never active in production builds.
  if (process.env.NODE_ENV === "development" && process.env.DEV_USER_ID) return process.env.DEV_USER_ID;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); // getUser, NOT getSession: verifies the JWT
  return user?.id ?? null;
});

export const requireUser = cache(async () => {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  await db.insert(profiles).values({ id: userId }).onConflictDoNothing();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  return { userId, profile: profile! };
});

/** True while the student has skipped the diagnostic: practice, tests and the plan stay locked. */
export const diagnosticPending = (p: { onboardingStep: string }) => p.onboardingStep === "diagnostic_skipped";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
