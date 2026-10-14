import Link from "next/link";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { studentCourseAssignments } from "@/db/schema";
import { CBSE_CHAPTERS } from "@/content/cbse-chapters";
import { COURSE_BY_ID } from "@/content/chapter-courses";
import { findConflicts } from "@/engine/assignment";
import { requireAdmin } from "@/server/admin";
import { conditionChapters, loadCatalogData } from "@/server/course-assignment";
import { saveVersionAction } from "./actions";

export const metadata = { title: "Course assignment" };
const CHAPTER_TITLE = new Map(CBSE_CHAPTERS.map((c) => [c.id, c.title]));
const STATUS_FILTER = ["all", "draft", "live", "disabled"] as const;

export default async function AssignmentsPage({ searchParams }: PageProps<"/admin/assignments">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = STATUS_FILTER.includes(sp.status as never) ? (sp.status as (typeof STATUS_FILTER)[number]) : "all";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100).toLowerCase() : "";
  const data = await loadCatalogData();
  const perVersion = new Map((await db.select({ versionId: studentCourseAssignments.versionId, n: count() }).from(studentCourseAssignments)
    .groupBy(studentCourseAssignments.versionId)).map((r) => [r.versionId, r.n]));
  const nameOf = new Map(data.ruleRows.map((r) => [r.id, r.name]));
  const conflicts = findConflicts(data.rules);
  const rules = data.ruleRows.filter((r) => (status === "all" || r.status === status) && (!q || r.name.toLowerCase().includes(q)));
  const notice = typeof sp.saved === "string" ? "Saved." : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Course assignment</h1>
        <p className="text-sm text-muted-foreground">Each Class 11 chapter is its own course with a default version and a covered version. Rules decide which version of each course a student gets, from the CBSE chapters they have completed. Click a version to edit its lessons. Drafts do nothing until published. Publishing re-checks every student.</p>
      </header>

      {notice && <p role="status" className="rounded-md border p-3 text-sm">{notice}</p>}
      {error && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}

      <section aria-labelledby="versions" className="flex flex-col gap-4">
        <h2 id="versions" className="font-medium">Course versions</h2>
        {data.versionRows.length === 0 ? <p className="text-sm text-muted-foreground">No versions yet. Add one below before writing rules.</p> : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <caption className="sr-only">Course versions and how many students are on each</caption>
              <thead className="text-left text-xs text-muted-foreground"><tr><th scope="col" className="p-3">Version</th><th scope="col" className="p-3">Status</th><th scope="col" className="p-3">Fallback</th><th scope="col" className="p-3 text-right">Students</th></tr></thead>
              <tbody>
                {data.versionRows.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="p-3"><Link href={`/admin/assignments/versions/${v.id}`} className="font-medium underline underline-offset-4">{v.name}</Link> <span className="text-xs text-muted-foreground">({v.id}{COURSE_BY_ID[v.courseId] ? `, ${COURSE_BY_ID[v.courseId]!.title}` : `, ${v.courseId}`})</span></td>
                    <td className="p-3">{v.status}</td>
                    <td className="p-3">{v.isFallback ? "Yes" : "No"}</td>
                    <td className="p-3 text-right tabular-nums">{perVersion.get(v.id) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form action={saveVersionAction} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2" aria-label="Add or update a course version">
          <label className="flex flex-col gap-1 text-sm font-medium">Version id<input name="id" required pattern="[a-z0-9][a-z0-9-]{1,62}" placeholder="straight-lines-covered" className="min-h-11 rounded-md border bg-background px-3 text-sm font-normal" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Course id<input name="courseId" required defaultValue="straight-lines" className="min-h-11 rounded-md border bg-background px-3 text-sm font-normal" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Name<input name="name" required maxLength={120} className="min-h-11 rounded-md border bg-background px-3 text-sm font-normal" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Status
            <select name="status" defaultValue="draft" className="min-h-11 rounded-md border bg-background px-3 text-sm font-normal">
              <option value="draft">Draft</option><option value="published">Published</option><option value="retired">Retired</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="isFallback" /> Use as the fallback for students no rule matches (must be published)</label>
          <div className="sm:col-span-2"><button type="submit" className="min-h-11 rounded-md border px-4 text-sm font-medium hover:bg-muted">Save version</button></div>
        </form>
      </section>

      <section aria-labelledby="rules" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="rules" className="font-medium">Rules</h2>
          <Link href="/admin/assignments/rules/new" className="min-h-11 inline-flex items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">New rule</Link>
        </div>
        {conflicts.length > 0 && (
          <div role="status" className="flex flex-col gap-2 rounded-xl border border-amber-500/50 p-4 text-sm">
            <p className="font-medium">Possible conflicts between live rules</p>
            <ul className="list-disc pl-5">
              {conflicts.map((c, i) => (
                <li key={i}>{c.kind === "same_condition" ? "Two live rules share a condition but send students to different versions" : "Two live rules have the same priority"}: {c.ruleIds.map((id) => nameOf.get(id) ?? id).join(" and ")}</li>
              ))}
            </ul>
          </div>
        )}
        <form method="get" className="flex flex-wrap items-end gap-3" aria-label="Filter rules">
          <label className="flex flex-col gap-1 text-sm font-medium">Status
            <select name="status" defaultValue={status} className="min-h-11 rounded-md border bg-background px-3 text-sm font-normal">
              {STATUS_FILTER.map((s) => <option key={s} value={s}>{s === "all" ? "All" : s[0]!.toUpperCase() + s.slice(1)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">Name contains<input name="q" defaultValue={q} className="min-h-11 rounded-md border bg-background px-3 text-sm font-normal" /></label>
          <button type="submit" className="min-h-11 rounded-md border px-4 text-sm font-medium hover:bg-muted">Filter</button>
        </form>
        {rules.length === 0 ? <p className="text-sm text-muted-foreground">No rules match. Create one, or clear the filters.</p> : (
          <ul className="flex flex-col divide-y rounded-xl border">
            {rules.map((r) => {
              const chapters = conditionChapters(r.condition as never);
              const target = data.versionRows.find((v) => v.id === r.targetVersionId)?.name ?? r.targetVersionId;
              return (
                <li key={r.id} className="flex flex-col gap-1 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/assignments/rules/${r.id}`} className="font-medium underline underline-offset-4">{r.name}</Link>
                    <span className="text-xs text-muted-foreground">{r.status[0]!.toUpperCase() + r.status.slice(1)}</span>
                    <span className="text-xs text-muted-foreground">priority {r.priority}</span>
                  </div>
                  <p className="text-muted-foreground">
                    {(r.condition as { all?: unknown[] }).all ? "All of" : "Any of"}: {chapters.map((c) => CHAPTER_TITLE.get(c) ?? c).join("; ")} → {target}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
