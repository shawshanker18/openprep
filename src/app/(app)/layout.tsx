import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { signOut } from "@/app/auth/actions";
import { NotificationBell } from "@/components/notification-bell";
import { getNotifications } from "@/server/notifications";

const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/practice", label: "Practice" },
  { href: "/skills", label: "Skills" },
  { href: "/tests", label: "Tests" },
  { href: "/progress", label: "Progress" },
] as const;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { userId, profile } = await requireUser();
  if (profile.onboardingStep !== "done" && profile.onboardingStep !== "diagnostic_skipped") redirect("/onboarding");
  const notifications = await getNotifications(userId, profile);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <nav className="sticky top-0 z-10 hidden w-48 shrink-0 flex-col gap-1 border-r p-4 md:flex md:h-screen">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold">OpenPrep</Link>
          <NotificationBell items={notifications} />
        </div>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-md px-2 py-1.5 text-sm hover:bg-muted">{n.label}</Link>
        ))}
        <div className="mt-auto flex flex-col gap-1 text-sm text-muted-foreground">
          <Link href="/mistakes" className="px-2 py-1 hover:text-foreground">Mistakes</Link>
          <Link href="/bookmarks" className="px-2 py-1 hover:text-foreground">Bookmarks</Link>
          <Link href="/desmos" className="px-2 py-1 hover:text-foreground">Desmos</Link>
          <Link href="/plan" className="px-2 py-1 hover:text-foreground">Plan</Link>
          <Link href="/settings" className="px-2 py-1 hover:text-foreground">Settings</Link>
          <form action={signOut}><button className="px-2 py-1 hover:text-foreground">Sign out</button></form>
        </div>
      </nav>
      <div className="flex items-center gap-4 overflow-x-auto border-b px-4 py-2 text-sm text-muted-foreground md:hidden">
        <NotificationBell items={notifications} fixed />
        <Link href="/mistakes">Mistakes</Link><Link href="/bookmarks">Bookmarks</Link><Link href="/plan">Plan</Link><Link href="/desmos">Desmos</Link><Link href="/settings">Settings</Link>
      </div>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-24 pt-6 md:pb-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t bg-background py-2 md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="px-2 py-1 text-xs">{n.label}</Link>
        ))}
      </nav>
    </div>
  );
}
