import Link from "next/link";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { getAuthUser, requireUser } from "@/server/auth";
import { signOut } from "@/app/auth/actions";
import { NotificationBell } from "@/components/notification-bell";
import { CurrentSection, MobileMenu, MobileTabs, NavLinks } from "@/components/app-nav";
import { AppBridge } from "@/components/app-bridge";
import { getChecklist, getNotifications } from "@/server/notifications";
import { getSkillSummary } from "@/server/analytics";
import { levelOf, points } from "@/engine/course";
import { isAdmin } from "@/server/admin";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { userId, profile } = await requireUser();
  if (profile.onboardingStep !== "done" && profile.onboardingStep !== "diagnostic_skipped" && profile.onboardingStep !== "diagnostic") redirect("/onboarding");
  const [notifications, checklist, user, summary, admin] = await Promise.all([
    getNotifications(userId, profile), getChecklist(userId, profile), getAuthUser(), getSkillSummary(userId),
    isAdmin(userId),
  ]);
  const nav = { checklist, user: user?.name ?? user?.email ?? "Settings", signOut, isAdmin: admin };
  const mastery = points(summary.skills.map((k) => levelOf(k.n, k.status))).earned;

  // Top utility bar: skill mastery points and the bell on desktop.
  const chips = (
    <>
      <Link href="/skills" className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm tabular-nums hover:bg-muted" title="Mastery points across your skills">
        <Award className="size-4" />{mastery.toLocaleString("en-US")} points
      </Link>
    </>
  );

  return (
    <div className="flex min-w-0 max-w-full flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:flex-row md:pb-0">
      <aside className="app-sidebar sticky top-0 z-10 hidden h-dvh w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r p-4 md:flex">
        <Link href="/dashboard" className="text-lg font-semibold">OpenPrep</Link>
        <NavLinks {...nav} />
      </aside>
      <header className="app-mobile-header sticky top-0 z-10 flex items-center justify-between border-b bg-background py-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:hidden">
        <MobileMenu {...nav} />
        <Link href="/dashboard" className="font-semibold">OpenPrep</Link>
        <NotificationBell items={notifications} align="right" />
      </header>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="app-topbar sticky top-0 z-10 hidden items-center justify-end gap-2 border-b bg-background px-8 py-2 md:flex">
          <CurrentSection />
          {chips}
          <NotificationBell items={notifications} align="right" />
        </div>
        <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-8 pt-6 md:px-8 has-[.question-content]:max-w-none">
          <div className="mb-4 flex flex-wrap items-center gap-2 md:hidden"><CurrentSection />{chips}</div>
          {children}
        </main>
      </div>
      <MobileTabs />
      <AppBridge reminderHour={profile.reminderHour} timezone={profile.timezone} />
    </div>
  );
}
