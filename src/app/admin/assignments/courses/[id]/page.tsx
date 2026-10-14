import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, courseSkills, courseVersions } from "@/db/schema";
import { CBSE_CHAPTERS } from "@/content/cbse-chapters";
import { DOMAINS, SKILLS } from "@/content/taxonomy";
import { requireAdmin } from "@/server/admin";
import { saveCourseAction } from "../../actions";

export const metadata = { title: "Course" };
const label = "flex flex-col gap-1 text-sm font-medium";
const input = "min-h-11 rounded-md border bg-background px-3 text-sm font-normal";

export default async function CoursePage({ params, searchParams }: PageProps<"/admin/assignments/courses/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const [course] = isNew ? [] : await db.select().from(courses).where(eq(courses.id, id));
  if (!isNew && !course) notFound();
  const owners = new Map((await db.select().from(courseSkills)).map((r) => [r.skillId, r.courseId]));
  const mine = new Set([...owners].filter(([, c]) => c === id).map(([s]) => s));
  const versions = isNew ? [] : await db.select().from(courseVersions).where(eq(courseVersions.courseId, id)).orderBy(courseVersions.id);
  const error = typeof sp.error === "string" ? sp.error : null;
  const notice = sp.created ? "Course created with its default and covered versions and a draft rule. Open the covered version to review its lessons, then publish it." : sp.saved ? "Saved." : null;
  const domainIds = [...new Set(SKILLS.map((s) => s.domain))];

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/assignments" className="text-sm text-muted-foreground underline">← Course assignment</Link>
      <h1 className="text-xl font-semibold">{isNew ? "New course" : course!.title}</h1>
      {notice && <p role="status" className="rounded-md border p-3 text-sm">{notice}</p>}
      {error && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}

      {!isNew && (
        <section aria-labelledby="versions" className="flex flex-col gap-2 rounded-xl border p-5">
          <h2 id="versions" className="font-medium">Versions</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {versions.map((v) => (
              <li key={v.id}><Link href={`/admin/assignments/versions/${v.id}`} className="underline underline-offset-4">{v.name}</Link> <span className="text-muted-foreground">({v.id}) · {v.status}{v.isFallback ? " · fallback" : ""}</span></li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">Open a version to edit its lessons or publish it. Add more versions, and the rules that choose between them, on the Course assignment page.</p>
        </section>
      )}

      <form action={saveCourseAction} className="flex flex-col gap-5 rounded-xl border p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Course id<input name="id" required pattern="[a-z0-9][a-z0-9-]{1,62}" placeholder="linear-inequalities" defaultValue={isNew ? "" : id} readOnly={!isNew} className={input} />
            {isNew && <span className="text-xs font-normal text-muted-foreground">Lowercase letters, numbers and dashes. It cannot be changed later.</span>}</label>
          <label className={label}>Title<input name="title" required maxLength={120} defaultValue={course?.title ?? ""} className={input} /></label>
          <label className={`${label} sm:col-span-2`}>Chapter that routes students to the covered version
            <select name="chapterId" defaultValue={course?.chapterId ?? ""} className={`${input} sm:max-w-md`}>
              <option value="">None (no rule is drafted)</option>
              {([9, 10, 11, 12] as const).map((g) => (
                <optgroup key={g} label={`Class ${g}`}>{CBSE_CHAPTERS.filter((c) => c.grade === g).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</optgroup>
              ))}
            </select>
            {isNew ? <span className="text-xs font-normal text-muted-foreground">A draft rule is created: students who completed this chapter get the covered version.</span>
              : <span className="text-xs font-normal text-muted-foreground">Changing this does not change existing rules. Edit those on the Course assignment page.</span>}
          </label>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">SAT skills whose lessons this course owns</legend>
          <p className="text-sm text-muted-foreground">A skill can belong to one course only. Skills already taken by another course are greyed out.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {domainIds.map((d) => (
              <div key={d} className="flex flex-col gap-2 rounded-lg border p-3">
                <p className="text-sm font-medium">{DOMAINS[d as keyof typeof DOMAINS]?.name ?? d}</p>
                {SKILLS.filter((s) => s.domain === d).map((s) => {
                  const other = owners.get(s.id) && owners.get(s.id) !== id ? owners.get(s.id) : null;
                  return (
                    <label key={s.id} className={`flex items-start gap-2 text-sm ${other ? "text-muted-foreground" : ""}`}>
                      <input type="checkbox" name="skills" value={s.id} defaultChecked={mine.has(s.id)} disabled={!!other} className="mt-1" />
                      <span>{s.name}{other && <span className="text-xs"> (in {other})</span>}</span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="min-h-11 self-start rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground">{isNew ? "Create course" : "Save course"}</button>
      </form>
    </div>
  );
}
