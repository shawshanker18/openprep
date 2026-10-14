import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assignmentRules } from "@/db/schema";
import { CBSE_CHAPTERS } from "@/content/cbse-chapters";
import { evaluateAssignment, evaluateExpr, type Expr } from "@/engine/assignment";
import { requireAdmin } from "@/server/admin";
import { chapterCatalog, conditionChapters, loadCatalogData, toRule } from "@/server/course-assignment";
import { previewRuleImpact } from "@/server/assignment-admin";
import { RuleForm, type RuleFormValues } from "../../rule-form";
import { setRuleStatusAction } from "../../actions";

export const metadata = { title: "Edit rule" };
const CHAPTER_TITLE = new Map(CBSE_CHAPTERS.map((c) => [c.id, c.title]));
const grades = [9, 10, 11, 12] as const;

/** The form's op and chapter list, read back from a stored condition. */
function formValues(row: typeof assignmentRules.$inferSelect): RuleFormValues {
  const cond = row.condition as Expr;
  const op = "any" in cond ? "any" : "all";
  return {
    id: row.id, name: row.name, description: row.description, status: row.status as RuleFormValues["status"], priority: row.priority,
    targetVersionId: row.targetVersionId, op, chapters: conditionChapters(cond),
    effectiveFrom: row.effectiveFrom?.toISOString(), effectiveUntil: row.effectiveUntil?.toISOString(),
  };
}

export default async function EditRulePage({ params, searchParams }: PageProps<"/admin/assignments/rules/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [row] = await db.select().from(assignmentRules).where(eq(assignmentRules.id, id));
  if (!row) notFound();
  const sp = await searchParams;
  const data = await loadCatalogData();
  const versions = data.versionRows.map((v) => ({ id: v.id, name: v.name, published: v.status === "published" }));
  const values = formValues(row);

  const sample = [sp.sample ?? []].flat().filter((c): c is string => typeof c === "string" && CHAPTER_TITLE.has(c));
  const ruleAsLive = { ...toRule(row), active: true };
  const condition = row.condition as Expr;
  const ruleMatches = evaluateExpr(condition, new Set(sample));
  // The sample run covers this rule's own course: versions, rules and the fallback of other courses never compete with it.
  const courseId = data.courseOfVersion.get(row.targetVersionId);
  const inCourse = (versionId: string) => data.courseOfVersion.get(versionId) === courseId;
  const overall = sp.sampleRun !== undefined ? evaluateAssignment({
    completed: sample, chapters: chapterCatalog(), versions: data.versions.filter((v) => inCourse(v.id)),
    rules: data.rules.filter((r) => inCourse(r.targetVersionId)).map((r) => (r.id === id ? ruleAsLive : r)),
    fallbackVersionId: (courseId && data.fallbackByCourse.get(courseId)) || null, now: new Date(),
  }) : null;
  const versionName = (vid: string | null) => data.versionRows.find((v) => v.id === vid)?.name ?? vid ?? "none";
  const impact = sp.impact === "1" ? await previewRuleImpact(id, { ...values, status: "live", effectiveFrom: values.effectiveFrom, effectiveUntil: values.effectiveUntil }) : null;

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/assignments" className="text-sm text-muted-foreground underline">← Course assignment</Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">{row.name}</h1>
        <p className="text-sm text-muted-foreground">Status: <b className="font-medium text-foreground">{row.status}</b> · priority {row.priority}</p>
      </header>

      {typeof sp.saved === "string" && <p role="status" className="rounded-md border p-3 text-sm">Saved.</p>}
      {typeof sp.recalculated === "string" && (
        <p role="status" className="rounded-md border p-3 text-sm">
          Checked {sp.recalculated} students; {sp.changed} changed course{sp.changed === "1" ? "" : "s"}.{sp.capped === "1" ? " This run stopped at the per-run limit. Run it again to cover the rest." : ""}
        </p>
      )}
      {typeof sp.error === "string" && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{sp.error}</p>}

      <section aria-labelledby="lifecycle" className="flex flex-col gap-3 rounded-xl border p-5">
        <h2 id="lifecycle" className="font-medium">Publishing</h2>
        <p className="text-sm text-muted-foreground">Only live rules apply to students. Publishing re-checks every student and records each change in their history. Lesson progress is never changed.</p>
        <div className="flex flex-wrap gap-2">
          {(["live", "draft", "disabled"] as const).filter((s) => s !== row.status).map((s) => (
            <form key={s} action={setRuleStatusAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value={s} />
              <button type="submit" className="min-h-11 rounded-md border px-4 text-sm font-medium hover:bg-muted">
                {s === "live" ? "Publish (go live)" : s === "draft" ? "Back to draft" : "Disable"}
              </button>
            </form>
          ))}
        </div>
        <p className="text-sm">
          <Link className="underline" href={`/admin/assignments/rules/${id}?impact=1`}>Preview impact</Link>
          <span className="text-muted-foreground"> Shows how many students would change. Nothing is saved.</span>
        </p>
        {impact && (
          impact.ok ? (
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5" aria-label="Impact of publishing">
              <div><dt className="text-muted-foreground">Students checked</dt><dd className="tabular-nums">{impact.impact.students}</dd></div>
              <div><dt className="text-muted-foreground">Move to another version</dt><dd className="tabular-nums">{impact.impact.toNewVersion}</dd></div>
              <div><dt className="text-muted-foreground">Newly assigned</dt><dd className="tabular-nums">{impact.impact.newlyAssigned}</dd></div>
              <div><dt className="text-muted-foreground">Left unassigned</dt><dd className="tabular-nums">{impact.impact.becomesUnassigned}</dd></div>
              <div><dt className="text-muted-foreground">No change</dt><dd className="tabular-nums">{impact.impact.unchanged}</dd></div>
            </dl>
          ) : <p role="alert" className="text-sm text-destructive">{impact.problems.map((p) => p.message).join(" · ")}</p>
        )}
      </section>

      <section aria-labelledby="sample" className="flex flex-col gap-4 rounded-xl border p-5">
        <h2 id="sample" className="font-medium">Test against a sample profile</h2>
        <p className="text-sm text-muted-foreground">Tick the chapters a student has completed. You see whether this rule matches, which conditions it needs, and where that student would land with every live rule.</p>
        <form method="get" className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {grades.map((g) => (
              <details key={g} className="rounded-lg border p-3" open={g === 9 || undefined}>
                <summary className="cursor-pointer text-sm font-medium">Class {g}</summary>
                <div className="mt-3 flex flex-col gap-2">
                  {CBSE_CHAPTERS.filter((c) => c.grade === g).map((c) => (
                    <label key={c.id} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" name="sample" value={c.id} defaultChecked={sample.includes(c.id)} className="mt-1" />{c.title}
                    </label>
                  ))}
                </div>
              </details>
            ))}
          </div>
          <button type="submit" name="sampleRun" value="1" className="min-h-11 self-start rounded-md border px-4 text-sm font-medium hover:bg-muted">Test this profile</button>
        </form>
        {sp.sampleRun !== undefined && (
          <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-4 text-sm" role="status">
            <p><b className="font-medium">This rule:</b> {ruleMatches ? "matches" : "does not match"} this profile.</p>
            <ul className="flex flex-col gap-1">
              {conditionChapters(condition).map((c) => (
                <li key={c}>{sample.includes(c) ? "✓" : "✗"} {CHAPTER_TITLE.get(c) ?? c} {sample.includes(c) ? "completed" : "not completed"}</li>
              ))}
            </ul>
            {overall && (
              <p>
                <b className="font-medium">Whole course, with this rule treated as live and every other live rule as it is:</b>{" "}
                {overall.outcome === "assigned" ? `${versionName(overall.versionId)} (rule ${data.ruleRows.find((r) => r.id === overall.ruleId)?.name ?? overall.ruleId})`
                  : overall.outcome === "fallback" ? `${versionName(overall.versionId)} (fallback: no rule matched)` : "unassigned (no rule matched and no fallback is set)"}
              </p>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="edit" className="flex flex-col gap-4">
        <h2 id="edit" className="font-medium">Edit rule</h2>
        <RuleForm values={values} versions={versions} error={undefined} />
      </section>
    </div>
  );
}
