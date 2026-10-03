// Admins. Granted only from the backend (`npm run admin -- grant <email>`, or SQL in Supabase): the app's database role
// can read the admins table but not write it (drizzle/0010), so nothing a visitor does can make them an admin.
import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminAudit, admins } from "@/db/schema";
import { getUserId } from "./auth";

/** Is this user an admin? One lookup per request. */
export const isAdmin = cache(async (userId: string | null) => {
  if (!userId) return false;
  const [row] = await db.select({ id: admins.userId }).from(admins).where(eq(admins.userId, userId));
  return !!row;
});

/** For admin pages and actions. Anyone else gets a plain 404: the admin area doesn't admit it exists. */
export async function requireAdmin() {
  const userId = await getUserId();
  if (!userId || !(await isAdmin(userId))) notFound();
  return { adminId: userId };
}

/** Append-only record of what an admin did (the app can add rows, never change or delete them). */
export async function audit(adminId: string, action: string, target: string | null, detail?: Record<string, unknown>) {
  await db.insert(adminAudit).values({ adminId, action, target, detail: detail ?? null });
}

export type Directory = { id: string; email: string | null; createdAt: Date; lastSignInAt: Date | null };

/** Students' emails (auth.users) through the read-only directory function (drizzle/0011). */
export async function userDirectory(search: string | null, limit: number, skip: number): Promise<Directory[]> {
  const rows = await db.execute(sql`select id, email, created_at, last_sign_in_at from public.admin_user_directory(${search}, ${limit}, ${skip})`);
  return (rows as unknown as { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }[])
    .map((r) => ({ id: r.id, email: r.email, createdAt: new Date(r.created_at), lastSignInAt: r.last_sign_in_at ? new Date(r.last_sign_in_at) : null }));
}

export async function userEmails(ids: string[]): Promise<Map<string, Directory>> {
  ids = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!ids.length) return new Map();
  const rows = await db.execute(sql`select id, email, created_at, last_sign_in_at from public.admin_user_emails(${`{${ids.join(",")}}`}::uuid[])`);
  return new Map((rows as unknown as { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }[])
    .map((r) => [r.id, { id: r.id, email: r.email, createdAt: new Date(r.created_at), lastSignInAt: r.last_sign_in_at ? new Date(r.last_sign_in_at) : null }]));
}
