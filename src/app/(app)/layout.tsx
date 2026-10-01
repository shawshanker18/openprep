import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser, requireUser } from "@/server/auth";
import { signOut } from "@/app/auth/actions";
import { NotificationBell } from "@/components/notification-bell";
import { MobileMenu, MobileTabs, NavLinks } from "@/components/app-nav";
import { getChecklist, getNotifications } from "@/server/notifications";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { userId, profile } = await requireUser();
  if (profile.onboardingStep !== "done" && profile.onboardingStep !== "diagnostic_skipped") redirect("/onboarding");
  const [notifications, checklist, user] = await Promise.all([getNotifications(userId, profile), getChecklist(userId, profile), getAuthUser()]);
  const nav = { checklist, user: user?.name ?? user?.email ?? "Settings", signOut };

  return (
    <div className="flex flex-1 flex-col pb-16 md:flex-row md:pb-0">
      <aside className="sticky top-0 z-10 hidden h-screen w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r p-4 md:flex">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold">OpenPrep</Link>
          <NotificationBell items={notifications} />
        </div>
        <NavLinks {...nav} />
      </aside>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-2 md:hidden">
        <MobileMenu {...nav} />
        <Link href="/dashboard" className="font-semibold">OpenPrep</Link>
        <NotificationBell items={notifications} align="right" />
      </header>
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 pb-8 pt-6 md:px-8">{children}</main>
      <MobileTabs />
    </div>
  );
}
