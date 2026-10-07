// In-app notifications, computed on every request (no table, no email).
import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { Profile } from "@/db/schema";
import { diagnosticPending } from "./auth";
import { daysToTest, dueReviewsNow, mockDueNow } from "./daily";

export type Notification = { id: string; label: string; href: string };

export async function getNotifications(userId: string, profile: Profile): Promise<Notification[]> {
  const days = daysToTest(profile);
  const [reviews, mock] = await Promise.all([dueReviewsNow(userId), mockDueNow(userId, days)]);
  const out: Notification[] = diagnosticPending(profile) ? [{ id: "diagnostic", label: "Optional: find your starting point", href: "/onboarding" }] : [];
  if (reviews > 0) out.push({ id: "reviews", label: `${reviews} review${reviews === 1 ? "" : "s"} due now`, href: "/practice?mode=review" });
  if (mock.due) out.push({ id: "mock", label: "A full mock test is due", href: "/tests" });
  if (days != null && days >= 0 && days <= 7) out.push({ id: "test", label: `Your SAT is in ${days} day${days === 1 ? "" : "s"}`, href: "/dashboard" });
  return out;
}

export type ChecklistItem = { id: string; label: string; hint: string; href: string; done: boolean };

/** "Getting started" steps for the sidebar; one query. Hidden by the layout once every step is done. */
export async function getChecklist(userId: string, profile: Profile): Promise<ChecklistItem[]> {
  const [r] = await db.execute<{ practiced: boolean; reviewed: boolean; mock: boolean; push: boolean }>(sql`
    select
      exists(select 1 from attempts where user_id = ${userId} and context = 'practice' offset 9) as practiced,
      exists(select 1 from attempts where user_id = ${userId} and context = 'review') as reviewed,
      exists(select 1 from test_sessions where user_id = ${userId} and kind = 'full' and status = 'completed') as mock,
      exists(select 1 from push_subscriptions where user_id = ${userId}) as push`);
  return [
    { id: "goal", label: "Set a target score and test date", hint: "Your goal and date shape the daily plan and the countdown.", href: "/settings", done: !!(profile.targetScore && profile.testDate) },
    { id: "practice", label: "Answer 10 practice questions", hint: "Adaptive Practice adjusts questions and difficulty using your recent answers.", href: "/practice", done: !!r?.practiced },
    { id: "review", label: "Review a mistake", hint: "Missed questions come back after 1, 3 and 7 days, until they stick.", href: "/mistakes", done: !!r?.reviewed },
    { id: "mock", label: "Take a full practice test", hint: "A timed, adaptive mock that checks your pace and gives a score range.", href: "/tests", done: !!r?.mock },
    { id: "reminders", label: "Turn on study reminders", hint: "A nudge at your study time on days you haven't practiced yet.", href: "/settings#reminders", done: !!r?.push || profile.reminderHour != null },
  ];
}
