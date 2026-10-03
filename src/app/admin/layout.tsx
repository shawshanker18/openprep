import Link from "next/link";
import { requireAdmin } from "@/server/admin";
import { AdminTabs } from "./tabs";

export const metadata = { title: { template: "%s · Admin · OpenPrep", default: "Admin · OpenPrep" }, robots: { index: false, follow: false } };

/** Admin area. Non-admins get a 404 (here and again in every page and action: layouts alone aren't a security check). */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-lg font-semibold">OpenPrep admin</Link>
          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">admins only</span>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground underline">Back to the app</Link>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
