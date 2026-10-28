import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { tierOf, type Tier } from "@/lib/tiers";

export async function getTier(userId: string): Promise<Tier> {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  return tierOf(row);
}

export async function getSubscription(userId: string) {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  return row ?? null;
}
