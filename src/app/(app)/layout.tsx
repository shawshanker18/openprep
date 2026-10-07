import Link from "next/link";
import { Suspense } from "react";
import type { Profile } from "@/db/schema";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { getAuthUser, requireUser } from "@/server/auth";
import { signOut } from "@/app/auth/actions";
import { NotificationBell } from "@/components/notification-bell";
import { CurrentSection, MobileMenu, MobileTabs, NavLinks } from "@/components/app-nav";
import { AppBridge } from "@/components/app-bridge";
import { SiteFooter } from "@/components/footer-feedback";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { getChecklist, getNotifications } from "@/server/notifications";
import { getSkillSummary } from "@/server/analytics";
import { levelOf, points } from "@/engine/course";
import { isAdmin } from "@/server/admin";
import { safely } from "@/lib/safely";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { userId, profile } = await requireUser();
  if (profile.onboardingStep !== "done" && profile.onboardingStep !== "diagnostic_skipped" && profile.onboardingStep !== "diagnostic") redirect("/onboarding");
  // Furniture, not content: if any of these is slow or fails the page still renders without it.
  const [checklist, user, admin] = await Promise.all([
    safely(() => getChecklist(userId, profile), []), safely(() => getAuthUser(), null),
    safely(() => isAdmin(userId), false),
  ]);
  const nav = { checklist, user: user?.name ?? user?.email ?? "Settings", signOut, isAdmin: admin };
  const chips = <Suspense fallback={null}><MasteryPoints userId={userId} /></Suspense>;
  const bell = <Suspense fallback={null}><UserNotifications userId={userId} profile={profile} /></Suspense>;

  return (
    <div className="flex min-w-0 max-w-full flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] desk:flex-row desk:pb-0">
      <aside className="app-sidebar fixed inset-y-0 left-0 z-10 hidden h-dvh w-56 shrink-0 flex-col gap-4 overflow-hidden border-r p-4 short:gap-2 short:p-3 tiny:gap-1 tiny:p-2 desk:flex">
        <Link href="/dashboard" className="text-lg font-semibold">OpenPrep</Link>
        <NavLinks {...nav} />
      </aside>
      <header className="app-mobile-header sticky top-0 z-10 flex items-center justify-between border-b bg-background py-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] desk:hidden">
        <MobileMenu {...nav} />
        <Link href="/dashboard" className="font-semibold">OpenPrep</Link>
        {bell}
      </header>
      <div className="app-content flex min-w-0 flex-1 flex-col desk:ml-56 [.lesson-focus-mode_&]:ml-0">
        <div className="app-topbar sticky top-0 z-10 hidden items-center justify-end gap-2 border-b bg-background px-4 py-2 desk:flex">
          <SidebarToggle />
          <CurrentSection />
          {chips}
          {bell}
        </div>
        <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-8 pt-6 lg:px-8 has-[.question-content]:max-w-none">
          <div className="mb-4 flex flex-wrap items-center gap-2 desk:hidden"><CurrentSection />{chips}</div>
          {children}
        </main>
        <SiteFooter scope="app" />
      </div>
      <MobileTabs />
      <AppBridge reminderHour={profile.reminderHour} timezone={profile.timezone} />
    </div>
  );
}

async function MasteryPoints({ userId }: { userId: string }) {
  const summary = await safely(() => getSkillSummary(userId), null);
  if (!summary) return null;
  const mastery = points(summary.skills.map((k) => levelOf(k.n, k.status))).earned;
  return <Link href="/skills" className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm tabular-nums hover:bg-muted" title="Mastery points across your skills"><Award className="size-4" />{mastery.toLocaleString("en-US")} points</Link>;
}

async function UserNotifications({ userId, profile }: { userId: string; profile: Profile }) {
  const notifications = await safely(() => getNotifications(userId, profile), []);
  return <NotificationBell items={notifications} align="right" />;
}
