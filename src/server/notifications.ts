// In-app notifications, computed on every request (no table, no email).
import "server-only";
import type { Profile } from "@/db/schema";
import { daysToTest, dueReviewsNow, mockDueNow } from "./daily";
import { getMembership } from "./subscription";
import { PLANS } from "@/lib/tiers";
import { planEnding } from "@/lib/membership";

export type Notification = { id: string; label: string; href: string };

export async function getNotifications(userId: string, profile: Profile): Promise<Notification[]> {
  const days = daysToTest(profile);
  const [reviews, mock, blocks] = await Promise.all([dueReviewsNow(userId), mockDueNow(userId, days), getMembership(userId)]);
  const out: Notification[] = [];
  if (reviews > 0) out.push({ id: "reviews", label: `${reviews} review${reviews === 1 ? "" : "s"} due now`, href: "/practice?mode=review" });
  if (mock.due) out.push({ id: "mock", label: "A full mock test is due", href: "/tests" });
  if (days != null && days >= 0 && days <= 7) out.push({ id: "test", label: `Your SAT is in ${days} day${days === 1 ? "" : "s"}`, href: "/dashboard" });
  const ending = planEnding(blocks, new Date());
  if (ending) out.unshift({ id: "plan", label: `Your ${PLANS[ending.tier].name} plan ends ${ending.days <= 0 ? "today" : `in ${ending.days} day${ending.days === 1 ? "" : "s"}`}. Add more time`, href: "/pricing" });
  return out;
}
