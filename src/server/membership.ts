import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { membershipBlocks, membershipPurchases } from "@/db/schema";
import { withDays, type Block } from "@/lib/membership";

/** Replaces the student's unfinished paid time. Runs inside a per-student lock so two payments cannot overwrite each other. */
async function change(userId: string, now: Date, apply: (blocks: Block[]) => Block[], guard: (tx: Tx) => Promise<boolean>) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`membership:${userId}`}))`);
    if (!(await guard(tx))) return false;
    const rows = await tx.select().from(membershipBlocks).where(and(eq(membershipBlocks.userId, userId), gt(membershipBlocks.endsAt, now)));
    const next = apply(rows.map((r) => ({ tier: r.tier as Block["tier"], startsAt: r.startsAt, endsAt: r.endsAt })));
    await tx.delete(membershipBlocks).where(and(eq(membershipBlocks.userId, userId), gt(membershipBlocks.endsAt, now)));
    if (next.length) await tx.insert(membershipBlocks).values(next.map((b) => ({ userId, ...b })));
    return true;
  });
}

/** Marks a payment completed and adds its days. Safe to call twice: only the first call changes anything. */
export async function grantPurchase(purchaseId: string, now = new Date()) {
  const [p] = await db.select().from(membershipPurchases).where(eq(membershipPurchases.id, purchaseId));
  if (!p) return false;
  return change(p.userId, now, (blocks) => withDays(blocks, p.tier as Block["tier"], p.days, now), async (tx) => {
    const done = await tx.update(membershipPurchases).set({ status: "completed", completedAt: now })
      .where(and(eq(membershipPurchases.id, purchaseId), eq(membershipPurchases.status, "created"))).returning({ id: membershipPurchases.id });
    return done.length > 0;
  });
}

/** A refunded or reversed payment takes its days back (never below zero). */
export async function revokePurchase(purchaseId: string, now = new Date()) {
  const [p] = await db.select().from(membershipPurchases).where(eq(membershipPurchases.id, purchaseId));
  if (!p) return false;
  return change(p.userId, now, (blocks) => withDays(blocks, p.tier as Block["tier"], -p.days, now), async (tx) => {
    const done = await tx.update(membershipPurchases).set({ status: "refunded" })
      .where(and(eq(membershipPurchases.id, purchaseId), eq(membershipPurchases.status, "completed"))).returning({ id: membershipPurchases.id });
    return done.length > 0;
  });
}
