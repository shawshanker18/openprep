import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { membershipPurchases } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { captureOrder } from "@/server/paypal";
import { isPaidTier } from "@/lib/tiers";
import { UpgradeConfirmation } from "./confirmation";

export const metadata = { title: "Your upgrade" };

export default async function UpgradeSuccess({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { userId } = await requireUser();
  const { order } = await searchParams;
  if (!order || typeof order !== "string") redirect("/pricing");
  const findPurchase = async () => (await db.select().from(membershipPurchases).where(and(eq(membershipPurchases.userId, userId), eq(membershipPurchases.paypalOrderId, order))))[0];
  let purchase = await findPurchase();
  if (!purchase || !isPaidTier(purchase.tier)) redirect("/pricing");
  if (purchase.status === "created") {
    await captureOrder(order, userId).catch(() => false);
    purchase = await findPurchase();
  }
  if (!purchase || !isPaidTier(purchase.tier)) redirect("/pricing");
  return <UpgradeConfirmation tier={purchase.tier} days={purchase.days} status={purchase.status} />;
}
