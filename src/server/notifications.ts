// In-app notifications, computed on every request (no table, no email).
import "server-only";
import type { Profile } from "@/db/schema";
import { diagnosticPending } from "./auth";
import { daysToTest, getTodayPlan, isMockDue } from "./daily";
import { countDueReviews } from "./practice";

export type Notification = { id: string; label: string; href: string };

export async function getNotifications(userId: string, profile: Profile): Promise<Notification[]> {
  const days = daysToTest(profile);
  if (diagnosticPending(profile)) {
    const out: Notification[] = [{ id: "diagnostic", label: "Your diagnostic is still to do", href: "/dashboard" }];
    if (days != null && days >= 0 && days <= 7) out.push({ id: "test", label: `Your SAT is in ${days} day${days === 1 ? "" : "s"}`, href: "/dashboard" });
    return out;
  }
  const [reviews, mock, plan] = await Promise.all([countDueReviews(userId), isMockDue(userId, days), getTodayPlan(userId, profile)]);
  const out: Notification[] = [];
  if (reviews > 0) out.push({ id: "reviews", label: `${reviews} review${reviews === 1 ? "" : "s"} due now`, href: "/practice?mode=review" });
  if (mock.due) out.push({ id: "mock", label: "A full mock test is due", href: "/tests" });
  if (days != null && days >= 0 && days <= 7) out.push({ id: "test", label: `Your SAT is in ${days} day${days === 1 ? "" : "s"}`, href: "/dashboard" });
  // No row yet = today's plan hasn't been opened, so it isn't finished either.
  if (!plan || plan.some((b) => !b.done)) out.push({ id: "plan", label: "Today's plan isn't finished", href: "/plan" });
  return out;
}
