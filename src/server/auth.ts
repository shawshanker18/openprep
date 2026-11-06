import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db, ensureDatabase } from "@/db";
import { profiles } from "@/db/schema";
import { guarded } from "./guard";

export type AuthUser = { id: string; email: string | null; name: string | null; avatarUrl: string | null };

/** Current user from a verified JWT, or null. One auth round-trip per request. */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  // Local-only stub so flows can be exercised without a real sign-in. Never active in production builds.
  if (process.env.NODE_ENV === "development" && process.env.DEV_USER_ID) return { id: process.env.DEV_USER_ID, email: null, name: null, avatarUrl: null };
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if(error && (error.name === "AuthRetryableFetchError" || (error.status??0)>=500)) throw new Error("Could not verify your session. Retry on this page."); // getUser, NOT getSession: verifies the JWT
  if (!user || user.is_anonymous) return null;
  const meta = user.user_metadata as { full_name?: string; name?: string; avatar_url?: string; picture?: string } | undefined;
  const avatar = meta?.avatar_url ?? meta?.picture ?? null;
  return { id: user.id, email: user.email ?? null, name: meta?.full_name ?? meta?.name ?? null, avatarUrl: avatar && /^https:\/\/[^/]*\.googleusercontent\.com\//.test(avatar) ? avatar : null };
});

export const getUserId = cache(async (): Promise<string | null> => (await getAuthUser())?.id ?? null);

export const requireUser = cache(async () => {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  // The first database touch of every signed-in page: bounded, so a stalled connection fails fast and gets replaced.
  return guarded((async () => {
    await ensureDatabase();
    // One round trip for returning users; the insert only runs on a first visit.
    let [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
    if (!profile) {
      await db.insert(profiles).values({ id: userId }).onConflictDoNothing();
      [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
    }
    return { userId, profile: profile! };
  })());
});

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

