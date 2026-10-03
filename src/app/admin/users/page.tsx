import Link from "next/link";
import { requireAdmin, userDirectory, userStats } from "@/server/admin";

export const metadata = { title: "Users" };

const PER_PAGE = 25;
const day = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "never");

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const found = await userDirectory(q || null, PER_PAGE + 1, (page - 1) * PER_PAGE);
  const users = found.slice(0, PER_PAGE);
  const more = found.length > PER_PAGE;
  const stats = await userStats(users.map((u) => u.id));
  const href = (p: number) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Users</h1>
      <form className="flex gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Search by email" aria-label="Search by email" className="h-9 w-full max-w-sm rounded-md border bg-background px-3 text-sm" />
        <button className="h-9 rounded-md border px-3 text-sm hover:bg-muted">Search</button>
        {q && <Link href="/admin/users" className="self-center text-sm underline">Clear</Link>}
      </form>
      {users.length === 0 ? <p className="text-muted-foreground">{q ? `No accounts match “${q}”.` : "No accounts yet."}</p> : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr><th className="p-3 font-normal">Email</th><th className="p-3 font-normal">Joined</th><th className="p-3 font-normal">Last sign-in</th>
                <th className="p-3 font-normal">Last active</th><th className="p-3 text-right font-normal">Answers</th><th className="p-3 text-right font-normal">Tests</th><th className="p-3 font-normal">Setup</th></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const s = stats.get(u.id);
                return (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-3"><Link className="underline" href={`/admin/users/${u.id}`}>{u.email ?? u.id}</Link></td>
                    <td className="p-3 tabular-nums">{day(u.createdAt)}</td>
                    <td className="p-3 tabular-nums">{day(u.lastSignInAt)}</td>
                    <td className="p-3 tabular-nums">{day(s?.last_active ?? null)}</td>
                    <td className="p-3 text-right tabular-nums">{(s?.answers ?? 0).toLocaleString("en-US")}</td>
                    <td className="p-3 text-right tabular-nums">{s?.tests ?? 0}</td>
                    <td className="p-3 text-xs text-muted-foreground">{s ? (s.step === "done" ? "done" : s.step?.replace("_", " ")) : "not started"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {(page > 1 || more) && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pages">
          {page > 1 ? <Link className="underline" href={href(page - 1)}>Newer</Link> : <span />}
          <span className="text-muted-foreground">Page {page}</span>
          {more ? <Link className="underline" href={href(page + 1)}>Older</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
