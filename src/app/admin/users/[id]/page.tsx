import Link from "next/link";
import { notFound } from "next/navigation";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { requireAdmin, userDetail, userEmails } from "@/server/admin";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { assignmentHistory } from "@/db/schema";

export const metadata = { title: "Student" };

const when = (d: Date | string | null) => (d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "—");

export default async function AdminUser({ params }: PageProps<"/admin/users/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [d, emails, courseHistory] = await Promise.all([
    userDetail(id), userEmails([id]),
    db.select().from(assignmentHistory).where(eq(assignmentHistory.userId, id)).orderBy(desc(assignmentHistory.evaluatedAt)).limit(50),
  ]);
  if (!d) notFound();
  const e = emails.get(id);
  const p = d.profile;
  const answers = Number(d.stats.answers ?? 0);
  const accuracy = answers ? Math.round((100 * Number(d.stats.correct ?? 0)) / answers) : null;
  const facts: [string, React.ReactNode][] = [
    ["Joined", when(e?.createdAt ?? (p.created_at as string))], ["Last sign-in", when(e?.lastSignInAt ?? null)],
    ["Last active", when(d.stats.last_active as string | null)], ["Setup", String(p.onboarding_step).replace("_", " ")],
    ["Target", p.target_score ? String(p.target_score) : "not set"], ["Test date", p.test_date ? String(p.test_date) : "not set"],
    ["Study time", `${p.minutes_per_day} min × ${p.days_per_week} days`], ["Time zone", String(p.timezone)],
    ["Answers", `${answers.toLocaleString("en-US")} (${d.stats.answers_7d ?? 0} this week)`], ["Accuracy", accuracy == null ? "—" : `${accuracy}%`],
    ["Average time", d.stats.avg_seconds ? `${d.stats.avg_seconds}s per question` : "—"], ["Grade", p.grade ? String(p.grade) : "—"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin/users" className="text-sm text-muted-foreground underline">← Users</Link>
        <h1 className="break-all text-xl font-semibold">{e?.email ?? id}</h1>
        {d.admin && <span className="self-start rounded-full border px-2 py-0.5 text-xs">admin</span>}
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl border p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b py-1 last:border-0 sm:border-0"><dt className="text-muted-foreground">{k}</dt><dd className="text-right tabular-nums">{v}</dd></div>)}
      </dl>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Recent answers</h2>
        {d.recent.length === 0 ? <p className="text-sm text-muted-foreground">No answers yet.</p> : (
          <ul className="flex flex-col divide-y rounded-xl border text-sm">
            {d.recent.map((a, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                <span>{SKILL_BY_ID[a.skill_id]?.name ?? a.skill_id} <span className="text-muted-foreground">· {a.context}</span></span>
                <span className="tabular-nums text-muted-foreground"><span className={a.correct ? "text-neutral-700" : "text-red-700"}>{a.correct ? "right" : "wrong"}</span> · {Math.round(a.time_ms / 1000)}s · {when(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Tests</h2>
        {d.tests.length === 0 ? <p className="text-sm text-muted-foreground">No tests yet.</p> : (
          <ul className="flex flex-col divide-y rounded-xl border text-sm">
            {d.tests.map((t) => (
              <li key={t.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                <span>{t.kind} <span className="text-muted-foreground">· {t.status.replace("_", " ")}</span></span>
                <span className="tabular-nums text-muted-foreground">{when(t.started_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Feedback and reports from this student</h2>
        {d.sent.length + d.reports.length === 0 ? <p className="text-sm text-muted-foreground">Nothing sent.</p> : (
          <ul className="flex flex-col divide-y rounded-xl border text-sm">
            {d.sent.map((f) => <li key={f.id} className="flex flex-col gap-1 px-3 py-2"><span className="text-xs text-muted-foreground">{f.kind}{f.rating ? ` · ${f.rating}/5` : ""} · {f.status.replace("_", " ")} · {when(f.created_at)}</span><span className="whitespace-pre-wrap break-words">{f.message}</span></li>)}
            {d.reports.map((r) => <li key={r.id} className="flex flex-col gap-1 px-3 py-2"><span className="text-xs text-muted-foreground">question report · {r.reason} · {r.status.replace("_", " ")} · {when(r.created_at)}</span>{r.note && <span className="break-words">{r.note}</span>}</li>)}
          </ul>
        )}
        <Link className="self-start text-sm underline" href="/admin/inbox">Handle these in the inbox</Link>
      </section>

      <section aria-labelledby="course-history" className="flex flex-col gap-2">
        <h2 id="course-history" className="font-medium">Course assignment history</h2>
        <p className="text-xs text-muted-foreground">A row is recorded only when the student&apos;s course changes. Lesson progress is never changed by reassignment.</p>
        {courseHistory.length === 0 ? <p className="text-sm text-muted-foreground">No course decisions yet. They appear once the student has a completed chapter or a rule or fallback applies.</p> : (
          <ol className="flex flex-col divide-y rounded-xl border text-sm">
            {courseHistory.map((h) => (
              <li key={h.id} className="flex flex-col gap-1 px-3 py-2">
                <span className="text-xs text-muted-foreground">{when(h.evaluatedAt)} · {h.outcome}{h.versionId ? ` · ${h.versionId}` : ""}</span>
                <span>{h.reason}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
