import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export type AuthUser = { id: string; email: string | null; name: string | null };

/** Current user from a verified JWT, or null. One auth round-trip per request. */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  // Local-only stub so flows can be exercised without a real sign-in. Never active in production builds.
  if (process.env.NODE_ENV === "development" && process.env.DEV_USER_ID) return { id: process.env.DEV_USER_ID, email: null, name: null };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); // getUser, NOT getSession: verifies the JWT
  if (!user) return null;
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  return { id: user.id, email: user.email ?? null, name: meta?.full_name ?? meta?.name ?? null };
});

export const getUserId = cache(async (): Promise<string | null> => (await getAuthUser())?.id ?? null);

export const requireUser = cache(async () => {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  // One round trip for returning users; the insert only runs on a first visit.
  let [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  if (!profile) {
    await db.insert(profiles).values({ id: userId }).onConflictDoNothing();
    [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  }
  return { userId, profile: profile! };
});

/** Whether to offer the optional starting-point diagnostic. Never an access restriction. */
export const diagnosticPending = (p: { onboardingStep: string }) => p.onboardingStep === "diagnostic_skipped" || p.onboardingStep === "diagnostic";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
