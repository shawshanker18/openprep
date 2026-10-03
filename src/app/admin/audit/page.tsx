import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { adminAudit } from "@/db/schema";
import { requireAdmin, userEmails } from "@/server/admin";

export const metadata = { title: "Audit log" };

const PER_PAGE = 50;
const when = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }) + " UTC";

/** What admins did, newest first. Rows can't be edited or deleted by the app (drizzle/0010). */
export default async function AdminAudit({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const rows = await db.select().from(adminAudit).orderBy(desc(adminAudit.createdAt)).limit(PER_PAGE + 1).offset((page - 1) * PER_PAGE);
  const more = rows.length > PER_PAGE;
  const emails = await userEmails(rows.map((r) => r.adminId));
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Audit log</h1>
      <p className="text-sm text-muted-foreground">Every change an admin makes is recorded here and can&apos;t be edited or deleted from the site.</p>
      {rows.length === 0 ? <p className="text-muted-foreground">No admin actions yet.</p> : (
        <ul className="flex flex-col divide-y rounded-xl border text-sm">
          {rows.slice(0, PER_PAGE).map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
              <span className="w-40 shrink-0 tabular-nums text-xs text-muted-foreground">{when(r.createdAt)}</span>
              <Link className="text-xs underline" href={`/admin/users/${r.adminId}`}>{emails.get(r.adminId)?.email ?? r.adminId}</Link>
              <code className="text-xs">{r.action}</code>
              {r.target && <code className="text-xs text-muted-foreground">{r.target}</code>}
              {r.detail?.note != null && <span className="min-w-0 flex-1 break-words text-xs">“{String(r.detail.note)}”</span>}
            </li>
          ))}
        </ul>
      )}
      {(page > 1 || more) && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pages">
          {page > 1 ? <Link className="underline" href={page === 2 ? "/admin/audit" : `/admin/audit?page=${page - 1}`}>Newer</Link> : <span />}
          <span className="text-muted-foreground">Page {page}</span>
          {more ? <Link className="underline" href={`/admin/audit?page=${page + 1}`}>Older</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
