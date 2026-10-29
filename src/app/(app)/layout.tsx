import Link from "next/link";
import { Suspense } from "react";
import type { Profile } from "@/db/schema";
import { redirect } from "next/navigation";
import { getAuthUser, requireUser } from "@/server/auth";
import { signOut } from "@/app/auth/actions";
import { NotificationBell } from "@/components/notification-bell";
import { AccountLinks, CurrentSection, MobileMenu, MobileTabs, NavLinks } from "@/components/app-nav";
import { AppBridge } from "@/components/app-bridge";
import { SiteFooter } from "@/components/footer-feedback";
import { BrandLogo } from "@/components/brand";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { NavArrows } from "@/components/nav-arrows";
import { getNotifications } from "@/server/notifications";
import { isAdmin } from "@/server/admin";
import { safely } from "@/lib/safely";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { userId, profile } = await requireUser();
  if (profile.onboardingStep !== "done" && profile.onboardingStep !== "diagnostic_skipped" && profile.onboardingStep !== "diagnostic") redirect("/onboarding");
  // Furniture, not content: if any of these is slow or fails the page still renders without it.
  const [user, admin] = await Promise.all([safely(() => getAuthUser(), null), safely(() => isAdmin(userId), false)]);
  const nav = { signOut, account: { name: user?.name ?? user?.email ?? "Account", email: user?.email ?? null, avatarUrl: user?.avatarUrl ?? null } };
  const account = <AccountLinks isAdmin={admin} user={user?.name ?? user?.email ?? "Account"} />;
  const bell = <Suspense fallback={<span className="inline-block size-9 shrink-0" aria-hidden />}><UserNotifications userId={userId} profile={profile} /></Suspense>;

  return (
    <div className="flex min-w-0 max-w-full flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] desk:flex-row desk:pb-0">
      <aside className="app-sidebar dark fixed inset-y-0 left-0 z-10 hidden h-dvh w-56 shrink-0 flex-col gap-4 overflow-hidden border-r bg-background p-4 text-foreground side:flex side:gap-[clamp(0.25rem,1.6dvh,1rem)] side:p-[clamp(0.5rem,2dvh,1rem)]">
        <Link href="/dashboard" aria-label="OpenPrep home" className="block px-2 pt-2 pb-[clamp(0.25rem,1.6dvh,1rem)]"><BrandLogo height={24} /></Link>
        <NavLinks {...nav} />
      </aside>
      <header className="app-mobile-header sticky top-0 z-10 flex items-center justify-between border-b bg-background py-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] desk:hidden">
        <MobileMenu {...nav} />
        <Link href="/dashboard" aria-label="OpenPrep home"><BrandLogo height={20} /></Link>
        <div className="flex items-center">{account}{bell}</div>
      </header>
      <div className="app-content flex min-w-0 flex-1 flex-col side:ml-56 [.lesson-focus-mode_&]:ml-0">
        <div className="app-topbar sticky top-0 z-10 hidden items-center justify-end gap-2 border-b bg-background px-4 py-2 desk:flex">
          <span className="inline-flex lap:hidden"><SidebarToggle /></span>
          <span className="hidden lap:inline-flex"><MobileMenu {...nav} /></span>
          <NavArrows />
          <CurrentSection />
          {account}
          {bell}
        </div>
        <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 min-[1536px]:max-w-6xl min-[1920px]:max-w-7xl min-[2560px]:max-w-[96rem] min-[3200px]:max-w-[110rem] px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-8 pt-6 lg:px-8 has-[.question-content]:max-w-none">
          <div className="mb-4 flex flex-wrap items-center gap-2 desk:hidden"><CurrentSection /></div>
          {children}
        </main>
        <SiteFooter scope="app" />
      </div>
      <MobileTabs />
      <AppBridge reminderHour={profile.reminderHour} timezone={profile.timezone} touchSeen={profile.touchSeen} tabletLayout={profile.tabletLayout} />
    </div>
  );
}

async function UserNotifications({ userId, profile }: { userId: string; profile: Profile }) {
  const notifications = await safely(() => getNotifications(userId, profile), []);
  return <NotificationBell items={notifications} align="right" />;
}
