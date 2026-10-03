import Link from "next/link";
import { activity, requireAdmin, userEmails } from "@/server/admin";

export const metadata = { title: "Activity" };

const PER_PAGE = 50;
const KIND_LABEL: Record<string, string> = { signup: "Joined", test: "Test", practice: "Practice", feedback: "Feedback", report: "Question report", security: "Security", admin: "Admin" };
const when = (d: string) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }) + " UTC";

export default async function AdminActivity({ searchParams }: PageProps<"/admin/activity">) {
  await requireAdmin();
  const sp = await searchParams;
  const before = typeof sp.before === "string" && !Number.isNaN(Date.parse(sp.before)) ? new Date(sp.before) : new Date();
  const events = await activity(before, PER_PAGE);
  const emails = await userEmails(events.flatMap((e) => (e.user_id ? [e.user_id] : [])));
  const oldest = events.at(-1)?.at;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Activity</h1>
      <p className="text-sm text-muted-foreground">Everything happening on OpenPrep, newest first. Practice is grouped by student and hour.</p>
      {events.length === 0 ? <p className="text-muted-foreground">Nothing yet.</p> : (
        <ul className="flex flex-col divide-y rounded-xl border text-sm">
          {events.map((e, i) => (
            <li key={`${e.at}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
              <span className="w-32 shrink-0 tabular-nums text-xs text-muted-foreground">{when(e.at)}</span>
              <span className="w-28 shrink-0 text-xs font-medium">{KIND_LABEL[e.kind] ?? e.kind}</span>
              <span className="min-w-0 flex-1">{e.detail}</span>
              <span className="text-xs">
                {e.user_id ? <Link className="underline" href={`/admin/users/${e.user_id}`}>{emails.get(e.user_id)?.email ?? "student"}</Link>
                  : e.kind === "security" ? <Link className="underline" href="/admin/inbox?type=security">open</Link> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      <nav className="flex items-center justify-between text-sm" aria-label="Pages">
        {sp.before ? <Link className="underline" href="/admin/activity">Newest</Link> : <span />}
        {events.length === PER_PAGE && oldest ? <Link className="underline" href={`/admin/activity?before=${encodeURIComponent(new Date(oldest).toISOString())}`}>Older</Link> : <span />}
      </nav>
    </div>
  );
}
