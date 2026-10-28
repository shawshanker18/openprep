import "server-only";
import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { membershipBlocks } from "@/db/schema";
import { tierAt, type Block } from "@/lib/membership";
import type { Tier } from "@/lib/tiers";

/** Paid time that has not ended yet, soonest first: what is running now and what follows. */
export async function getMembership(userId: string, now = new Date()): Promise<Block[]> {
  const rows = await db.select().from(membershipBlocks).where(and(eq(membershipBlocks.userId, userId), gt(membershipBlocks.endsAt, now))).orderBy(asc(membershipBlocks.startsAt));
  return rows.map((r) => ({ tier: r.tier as Block["tier"], startsAt: r.startsAt, endsAt: r.endsAt }));
}

export async function getTier(userId: string, now = new Date()): Promise<Tier> {
  return tierAt(await getMembership(userId, now), now);
}
