import Link from "next/link";
import { Bookmark, Check, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { DiagnosticGate } from "@/components/diagnostic-gate";
import { DOMAINS, SKILLS, SKILL_BY_ID, type DomainId } from "@/content/taxonomy";
import { diagnosticPending, requireUser } from "@/server/auth";
import { questionBank, type BankStatus } from "@/server/practice";

export const metadata = { title: "Question bank" };

const PAGE = 25;
const DIFF = { 1: "Easy", 2: "Medium", 3: "Hard" } as Record<number, string>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/** Plain one line preview: drop markdown and LaTeX markers, keep the words and numbers. */
function preview(md: string) {
  return md.replace(/\$\$?([^$]*)\$\$?/g, "$1").replace(/\\(frac|sqrt|cdot|times|le|ge|ne|pi|theta)\b/g, (_, w: string) => ({ frac: "", sqrt: "√", cdot: "·", times: "×", le: "≤", ge: "≥", ne: "≠", pi: "π", theta: "θ" })[w] ?? "")
    .replace(/[{}*_#>|\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
}

export default async function QuestionBankPage({ searchParams }: PageProps<"/question-bank">) {
  const sp = await searchParams;
  const { userId, profile } = await requireUser();
  if (diagnosticPending(profile)) return <DiagnosticGate />;

  const section = one(sp.section) === "math" || one(sp.section) === "rw" ? one(sp.section) : "";
  const skill = SKILL_BY_ID[one(sp.skill)] ? one(sp.skill) : "";
  const difficulty = ["1", "2", "3"].includes(one(sp.difficulty)) ? one(sp.difficulty) : "";
  const status = ["new", "correct", "incorrect", "saved"].includes(one(sp.status)) ? one(sp.status) : "";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const all = await questionBank(userId);
  const rows = all.filter((q) => (!section || q.section === section) && (!skill || q.skillId === skill)
    && (!difficulty || q.difficulty === Number(difficulty))
    && (!status || (status === "saved" ? q.saved : q.status === (status as BankStatus))));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice((page - 1) * PAGE, page * PAGE);
  const query = new URLSearchParams(Object.entries({ section, skill, difficulty, status }).filter(([, v]) => v)).toString();
  const here = `/question-bank${query ? `?${query}` : ""}`;
  // Practice starting at a question, then on through the rest of the filtered list (50 at most).
  const practiceFrom = (i: number) => `/practice?mode=list&ids=${rows.slice(i, i + 50).map((q) => q.id).join(",")}&from=${encodeURIComponent(here)}`;
  const counts = { new: all.filter((q) => q.status === "new").length, correct: all.filter((q) => q.status === "correct").length, incorrect: all.filter((q) => q.status === "incorrect").length };
  const skillOptions = SKILLS.filter((s) => !section || s.section === section).map((s) => ({ value: s.id, label: s.name }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Question bank</h1>
        <p className="text-sm text-muted-foreground">
          All {all.length} OpenPrep questions. {counts.correct} answered right, {counts.incorrect} to retry, {counts.new} you haven&apos;t seen yet.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end" action="/question-bank">
        <label className="flex flex-col gap-1 text-sm">Section
          <Choice name="section" defaultValue={section || "all"} options={[{ value: "all", label: "Both sections" }, { value: "math", label: "Math" }, { value: "rw", label: "Reading and Writing" }]} /></label>
        <label className="flex flex-col gap-1 text-sm">Skill
          <Choice name="skill" defaultValue={skill || "all"} options={[{ value: "all", label: "All skills" }, ...skillOptions]} /></label>
        <label className="flex flex-col gap-1 text-sm">Difficulty
          <Choice name="difficulty" defaultValue={difficulty || "all"} options={[{ value: "all", label: "Any difficulty" }, { value: "1", label: "Easy" }, { value: "2", label: "Medium" }, { value: "3", label: "Hard" }]} /></label>
        <label className="flex flex-col gap-1 text-sm">Status
          <Choice name="status" defaultValue={status || "all"} options={[{ value: "all", label: "Any status" }, { value: "new", label: "Not seen yet" },
            { value: "incorrect", label: "Got it wrong" }, { value: "correct", label: "Got it right" }, { value: "saved", label: "Saved" }]} /></label>
        <div className="flex gap-2">
          <Button type="submit">Filter</Button>
          {query && <Button variant="outline" render={<Link href="/question-bank" />}>Clear</Button>}
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{rows.length} question{rows.length === 1 ? "" : "s"}</p>
        {rows.length > 0 && <Button render={<Link href={practiceFrom(0)} />}>Practise {Math.min(rows.length, 50)} in a row</Button>}
      </div>

      {rows.length === 0 ? <p className="rounded-xl border p-5 text-sm text-muted-foreground">No questions match these filters.</p> : (
        <ol className="flex flex-col divide-y rounded-xl border">
          {shown.map((q, i) => {
            const at = (page - 1) * PAGE + i;
            const skillInfo = SKILL_BY_ID[q.skillId]!;
            return (
              <li key={q.id}>
                <Link href={practiceFrom(at)} className="flex items-start gap-3 p-4 hover:bg-muted">
                  <span className="mt-0.5 shrink-0" title={q.status === "correct" ? "Got it right" : q.status === "incorrect" ? "Got it wrong" : "Not seen yet"}>
                    {q.status === "correct" ? <Check className="size-4" /> : q.status === "incorrect" ? <X className="size-4 text-destructive" /> : <Circle className="size-4 text-muted-foreground" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    {/* Only questions this student has already seen show their text, so the bank can't be read page by page. */}
                    <span className="line-clamp-2 text-sm">{q.status === "new" && !q.saved ? `Question ${at + 1}` : preview(q.section === "rw" && q.passage ? q.passage : q.stem)}</span>
                    <span className="text-xs text-muted-foreground">
                      {DOMAINS[skillInfo.domain as DomainId].name} · {skillInfo.name} · {DIFF[q.difficulty]}{q.type === "spr" ? " · type your answer" : ""}
                    </span>
                  </span>
                  {q.saved && <Bookmark className="mt-0.5 size-4 shrink-0 fill-current" aria-label="Saved" />}
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pages">
          {page > 1 ? <Link className="underline" href={`/question-bank?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), page: String(page - 1) })}`}>Previous</Link> : <span />}
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          {page < pages ? <Link className="underline" href={`/question-bank?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), page: String(page + 1) })}`}>Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
