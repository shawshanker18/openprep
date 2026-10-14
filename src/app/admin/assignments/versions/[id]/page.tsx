import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { courseVersionLessons, courseVersions } from "@/db/schema";
import { COURSE_BY_ID } from "@/content/chapter-courses";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { requireAdmin } from "@/server/admin";
import { getLessonSource } from "@/server/lessons";
import { assignmentRules } from "@/db/schema";
import { publishVersionAction, resetVersionLessonAction, saveVersionLessonAction } from "../../actions";

export const metadata = { title: "Course version lessons" };

export default async function VersionLessonsPage({ params, searchParams }: PageProps<"/admin/assignments/versions/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [version] = await db.select().from(courseVersions).where(eq(courseVersions.id, id));
  if (!version) notFound();
  const sp = await searchParams;
  const course = COURSE_BY_ID[version.courseId];
  const saved = new Map((await db.select().from(courseVersionLessons).where(eq(courseVersionLessons.versionId, id))).map((r) => [r.skillId, r]));
  const draftRules = (await db.select({ id: assignmentRules.id }).from(assignmentRules).where(and(eq(assignmentRules.targetVersionId, id), eq(assignmentRules.status, "draft")))).length;
  const skills = course?.skills ?? [];
  const sources = new Map(await Promise.all(skills.map(async (s) => [s, await getLessonSource(s)] as const)));
  const notice = typeof sp.saved === "string" ? "Saved. Students on this version see it now." : typeof sp.reset === "string" ? "Back to the built-in lesson." : null;
  const error = typeof sp.error === "string" ? sp.error : null;
  const published = typeof sp.published === "string" ? `Published. ${sp.published} rule${sp.published === "1" ? "" : "s"} went live; checked ${sp.checked} students, ${sp.changed} changed route.${sp.capped === "1" ? " The run stopped at its limit, so publish again to cover the rest." : ""}` : null;

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/assignments" className="text-sm text-muted-foreground underline">← Course assignment</Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">{version.name}</h1>
        <p className="text-sm text-muted-foreground">
          {course ? `${course.title} course` : `Course ${version.courseId}`} · {version.id} · {version.status}{version.isFallback ? " · fallback" : ""}
        </p>
        <p className="text-sm text-muted-foreground">
          Each lesson below is what students on this version read for that skill. A lesson with no saved text uses the built-in lesson file, and you can start from it.
          Write sections as <code>## Heading</code> lines; a section called &ldquo;The fast way&rdquo; is not shown to students.
        </p>
      </header>

      {published && <p role="status" className="rounded-md border p-3 text-sm">{published}</p>}
      {notice && <p role="status" className="rounded-md border p-3 text-sm">{notice}</p>}
      {error && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
      {!course && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">This version&apos;s course is not a chapter course, so it has no lessons to edit.</p>}

      {(version.status !== "published" || draftRules > 0) && version.status !== "retired" && (
        <section aria-labelledby="publish" className="flex flex-col gap-3 rounded-xl border p-5">
          <h2 id="publish" className="font-medium">Publish</h2>
          <p className="text-sm text-muted-foreground">
            Publishing makes this version available and takes its {draftRules} draft rule{draftRules === 1 ? "" : "s"} live, then re-checks every student.
            Review the lessons below first: students on this version read them as written.
          </p>
          <form action={publishVersionAction}>
            <input type="hidden" name="versionId" value={version.id} />
            <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Publish this version</button>
          </form>
        </section>
      )}

      {skills.map((skillId) => {
        const own = saved.get(skillId);
        const source = sources.get(skillId);
        return (
          <section key={skillId} id={skillId} aria-labelledby={`h-${skillId}`} className="flex flex-col gap-3 rounded-xl border p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`h-${skillId}`} className="font-medium">{SKILL_BY_ID[skillId]?.name ?? skillId} <span className="text-xs font-normal text-muted-foreground">({skillId})</span></h2>
              <span className="text-xs text-muted-foreground">{own ? `Customised ${own.updatedAt.toISOString().slice(0, 10)}` : "Using the built-in lesson"}</span>
            </div>
            <form action={saveVersionLessonAction} className="flex flex-col gap-3">
              <input type="hidden" name="versionId" value={version.id} />
              <input type="hidden" name="skillId" value={skillId} />
              <label className="flex flex-col gap-1 text-sm font-medium">Lesson text
                <textarea name="body" required rows={18} defaultValue={own?.body ?? source?.body ?? ""} className="rounded-md border bg-background p-3 font-mono text-sm font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium sm:w-48">Minutes
                <input name="minutes" type="number" min={1} max={120} defaultValue={own?.minutes ?? source?.minutes ?? ""} className="min-h-11 rounded-md border bg-background px-3 text-sm font-normal" />
              </label>
              <div><button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Save lesson</button></div>
            </form>
            {own && (
              <form action={resetVersionLessonAction}>
                <input type="hidden" name="versionId" value={version.id} />
                <input type="hidden" name="skillId" value={skillId} />
                <button type="submit" className="min-h-11 rounded-md border px-4 text-sm font-medium hover:bg-muted">Use the built-in lesson again</button>
              </form>
            )}
          </section>
        );
      })}
    </div>
  );
}
