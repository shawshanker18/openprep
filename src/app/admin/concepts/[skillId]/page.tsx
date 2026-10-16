import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conceptQuestions, skillConcepts } from "@/db/schema";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { requireAdmin } from "@/server/admin";
import { questionsForSkillAdmin } from "@/server/concepts";
import { deleteConceptAction, saveConceptAction } from "../actions";

export const metadata = { title: "Skill concepts" };
const label = "flex flex-col gap-1 text-sm font-medium";
const input = "min-h-11 rounded-md border bg-background px-3 text-sm font-normal";
const button = "min-h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground";

const preview = (md: string) => md.replace(/\$[^$]*\$/g, "…").replace(/\s+/g, " ").trim().slice(0, 160);

export default async function SkillConceptsPage({ params, searchParams }: PageProps<"/admin/concepts/[skillId]">) {
  await requireAdmin();
  const { skillId } = await params;
  const skill = SKILL_BY_ID[skillId];
  if (!skill) notFound();
  const sp = await searchParams;
  const concepts = await db.select().from(skillConcepts).where(eq(skillConcepts.skillId, skillId)).orderBy(skillConcepts.sort, skillConcepts.title);
  const links = await db.select({ conceptId: conceptQuestions.conceptId, questionId: conceptQuestions.questionId }).from(conceptQuestions);
  const chosen = new Map<string, Set<string>>();
  for (const l of links) chosen.set(l.conceptId, new Set([...(chosen.get(l.conceptId) ?? []), l.questionId]));
  const questions = await questionsForSkillAdmin(skillId);
  const error = typeof sp.error === "string" ? sp.error : null;
  const notice = typeof sp.saved === "string" ? "Saved. Students who finished this skill see the change straight away." : sp.deleted ? "Concept deleted." : null;

  const questionPicker = (conceptId: string | null) => (
    <fieldset className="flex flex-col gap-2 text-sm">
      <legend className="mb-1 font-medium">Questions for this concept ({questions.length} active question{questions.length === 1 ? "" : "s"} in this skill)</legend>
      {questions.length === 0 ? <p className="text-muted-foreground">This skill has no active questions yet.</p> : (
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto rounded-md border p-2">
          {questions.map((q) => (
            <label key={q.id} className="flex items-start gap-2 rounded px-1 py-1 hover:bg-muted">
              <input type="checkbox" name="questions" value={q.id} defaultChecked={conceptId ? chosen.get(conceptId)?.has(q.id) : false} className="mt-1" />
              <span><span className="text-xs text-muted-foreground">Difficulty {q.difficulty} · {q.type === "mcq" ? "multiple choice" : "student-produced"} · </span>{preview(q.stemMd)}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/concepts" className="text-sm text-muted-foreground underline">← Concepts</Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{skill.name}</h1>
        <p className="text-sm text-muted-foreground">{concepts.length} concept{concepts.length === 1 ? "" : "s"}. A concept&apos;s explanation is what students read first, then they practise its questions.</p>
      </header>
      {notice && <p role="status" className="rounded-md border p-3 text-sm">{notice}</p>}
      {error && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}

      {concepts.map((c) => (
        <section key={c.id} id={`c-${c.id}`} className="flex flex-col gap-4 rounded-xl border p-5">
          <form action={saveConceptAction} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="skillId" value={skillId} />
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <label className={label}>Concept title<input name="title" required maxLength={120} defaultValue={c.title} className={input} /></label>
              <label className={label}>Order<input name="sort" type="number" min={0} max={999} defaultValue={c.sort} className={input} /></label>
            </div>
            <label className={label}>Explanation (Markdown; use $…$ for maths)
              <textarea name="explanationMd" rows={8} maxLength={8000} defaultValue={c.explanationMd} className="rounded-md border bg-background px-3 py-2 text-sm font-normal" />
            </label>
            {questionPicker(c.id)}
            <button type="submit" className={`${button} self-start`}>Save concept</button>
          </form>
          <form action={deleteConceptAction}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="skillId" value={skillId} />
            <button type="submit" className="min-h-11 text-sm text-destructive underline">Delete this concept</button>
          </form>
        </section>
      ))}

      <section aria-labelledby="new-concept" className="flex flex-col gap-4 rounded-xl border p-5">
        <h2 id="new-concept" className="font-medium">New concept</h2>
        <form action={saveConceptAction} className="flex flex-col gap-4">
          <input type="hidden" name="skillId" value={skillId} />
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <label className={label}>Concept title<input name="title" required maxLength={120} placeholder="e.g. Reading a discriminant" className={input} /></label>
            <label className={label}>Order<input name="sort" type="number" min={0} max={999} defaultValue={concepts.length} className={input} /></label>
          </div>
          <label className={label}>Explanation (Markdown; use $…$ for maths)
            <textarea name="explanationMd" rows={8} maxLength={8000} className="rounded-md border bg-background px-3 py-2 text-sm font-normal" />
          </label>
          {questionPicker(null)}
          <button type="submit" className={`${button} self-start`}>Create concept</button>
        </form>
      </section>
    </div>
  );
}
