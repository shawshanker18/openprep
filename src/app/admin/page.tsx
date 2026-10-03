import Link from "next/link";
import { overview, requireAdmin } from "@/server/admin";

export const metadata = { title: "Overview" };

function Stat({ label, value, sub, href }: { label: string; value: React.ReactNode; sub?: string; href?: string }) {
  const body = (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </>
  );
  const cls = "flex flex-col gap-1 rounded-xl border p-4";
  return href ? <Link href={href} className={`${cls} hover:bg-muted`}>{body}</Link> : <div className={cls}>{body}</div>;
}

export default async function AdminOverview() {
  await requireAdmin();
  const o = await overview();
  const n = (v: number | null | undefined) => (v ?? 0).toLocaleString("en-US");
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">Waiting for you</h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Feedback" value={n(o.open_feedback)} sub="new or in progress" href="/admin/inbox?type=feedback" />
          <Stat label="Question reports" value={n(o.open_questions)} sub="new or in progress" href="/admin/inbox?type=questions" />
          <Stat label="Security reports" value={n(o.open_security)} sub="new or in progress" href="/admin/inbox?type=security" />
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Students</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Accounts" value={n(o.users)} href="/admin/users" />
          <Stat label="New today" value={n(o.new_1d)} sub={`${n(o.new_7d)} in 7 days`} />
          <Stat label="Active today" value={n(o.active_1d)} sub={`${n(o.active_7d)} in 7 days`} />
          <Stat label="Average review" value={o.rating_30d != null ? `${o.rating_30d} / 5` : "None yet"} sub={`${n(o.ratings_30d)} ratings in 30 days`} />
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Learning</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Answers today" value={n(o.answers_1d)} sub={`${n(o.answers_7d)} in 7 days`} href="/admin/activity" />
          <Stat label="Tests started" value={n(o.tests_started_7d)} sub="in 7 days" />
          <Stat label="Tests finished" value={n(o.tests_done_7d)} sub="in 7 days" />
          <Stat label="Questions live" value={n(o.questions)} sub="active in the bank" />
        </div>
      </section>
    </div>
  );
}
