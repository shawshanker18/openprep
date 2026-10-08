// In-app notifications, computed on every request (no table, no email).
import "server-only";
import type { Profile } from "@/db/schema";
import { daysToTest, dueReviewsNow, mockDueNow } from "./daily";

export type Notification = { id: string; label: string; href: string };

export async function getNotifications(userId: string, profile: Profile): Promise<Notification[]> {
  const days = daysToTest(profile);
  const [reviews, mock] = await Promise.all([dueReviewsNow(userId), mockDueNow(userId, days)]);
  const out: Notification[] = [];
  if (reviews > 0) out.push({ id: "reviews", label: `${reviews} review${reviews === 1 ? "" : "s"} due now`, href: "/practice?mode=review" });
  if (mock.due) out.push({ id: "mock", label: "A full mock test is due", href: "/tests" });
  if (days != null && days >= 0 && days <= 7) out.push({ id: "test", label: `Your SAT is in ${days} day${days === 1 ? "" : "s"}`, href: "/dashboard" });
  return out;
}
