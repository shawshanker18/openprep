import Link from "next/link";
import { Bookmark, Check, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { DOMAINS, SKILLS, SKILL_BY_ID, type DomainId } from "@/content/taxonomy";
import { requireUser } from "@/server/auth";
import { questionBank, QUESTION_BANK_PAGE_SIZE, type BankFilters } from "@/server/practice";
import { publicId } from "@/server/questions";
import { cn } from "@/lib/utils";

export const metadata = { title: "Question bank" };

const PAGE = QUESTION_BANK_PAGE_SIZE;
const DIFF = { 1: "Easy", 2: "Medium", 3: "Hard" } as Record<number, string>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/** Plain one line preview: drop markdown and LaTeX markers, keep the words and numbers. */
function preview(md: string) {
  const sym: Record<string, string> = { frac: "", sqrt: "√", cdot: "·", times: "×", le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", lt: "<", gt: ">", pi: "π", theta: "θ" };
  // Only a line-leading ">" is markdown (a quote); anywhere else it's maths ("x > 0").
  return md.replace(/^>\s?/gm, "").replace(/\$\$?([^$]*)\$\$?/g, "$1").replace(/\\(frac|sqrt|cdot|times|leq|le|geq|ge|neq|ne|lt|gt|pi|theta)\b/g, (_, w: string) => sym[w] ?? "")
    .replace(/[{}*_#|\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
}

export default async function QuestionBankPage({ searchParams }: PageProps<"/question-bank">) {
  const sp = await searchParams;
  const { userId } = await requireUser();

  const section = one(sp.section) === "math" || one(sp.section) === "rw" ? one(sp.section) : "";
  const skill = SKILL_BY_ID[one(sp.skill)] ? one(sp.skill) : "";
  const difficulty = ["1", "2", "3"].includes(one(sp.difficulty)) ? one(sp.difficulty) : "";
  const status = ["new", "correct", "incorrect", "saved"].includes(one(sp.status)) ? one(sp.status) : "";
  const bank = await questionBank(userId, {
    section: section ? section as "math" | "rw" : undefined,
    skillId: skill || undefined, difficulty: difficulty ? Number(difficulty) as 1 | 2 | 3 : undefined,
    status: status ? status as BankFilters["status"] : undefined, page: Number(one(sp.page)),
  });
  const { rows: shown, counts, page, hasMore } = bank;
  const query = new URLSearchParams(Object.entries({ section, skill, difficulty, status }).filter(([, v]) => v)).toString();
  const returnQuery = new URLSearchParams(query);
  if (page > 1) returnQuery.set("page", String(page));
  const here = `/question-bank${returnQuery.size ? `?${returnQuery}` : ""}`;
  // Practice only the remaining questions on this displayed page.
  const practiceFrom = (i: number) => `/practice?mode=list&ids=${shown.slice(i).map((q) => publicId(q.id)).join(",")}&from=${encodeURIComponent(here)}`;
  const skillOptions = SKILLS.filter((s) => !section || s.section === section).map((s) => ({ value: s.id, label: s.name }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Question bank</h1>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">All questions</p><p className="text-2xl font-semibold tabular-nums">{counts.total}</p></div>
          <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Attempted</p><p className="text-2xl font-semibold tabular-nums">{counts.attempted} <span className="text-sm font-normal text-muted-foreground">of {counts.total}</span></p></div>
          <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Correct / retry</p><p className="text-2xl font-semibold tabular-nums">{counts.correct} <span className="text-sm font-normal text-muted-foreground">/ {counts.incorrect}</span></p></div>
        </div>
      </div>

      <nav aria-label="Question sections" className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/40 p-1">
        {[{ value: "", label: "All sections" }, { value: "math", label: "Math" }, { value: "rw", label: "English" }].map((tab) => {
          const active = section === tab.value;
          const href = tab.value ? `/question-bank?section=${tab.value}` : "/question-bank";
          const total = tab.value === "math" ? counts.math : tab.value === "rw" ? counts.rw : counts.total;
          return <Link key={tab.value || "all"} href={href} aria-current={active ? "page" : undefined} className={cn("rounded-lg px-3 py-2 text-center text-sm", active ? "bg-background font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground")}>{tab.label} <span className="text-xs text-muted-foreground">{total}</span></Link>;
        })}
      </nav>

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
        <p className="text-sm text-muted-foreground">{page > 1 ? `Page ${page} · 10 questions per page` : " "}</p>
        {shown.length > 0 && <Button render={<Link href={practiceFrom(0)} />}>Practice this page in a row</Button>}
      </div>

      {shown.length === 0 ? <p className="rounded-xl border p-5 text-sm text-muted-foreground">No questions match these filters.</p> : (
        <ol className="flex flex-col divide-y rounded-xl border">
          {shown.map((q, i) => {
            const at = (page - 1) * PAGE + i;
            const skillInfo = SKILL_BY_ID[q.skillId]!;
            return (
              <li key={at}>
                <Link href={practiceFrom(i)} className="flex items-start gap-3 p-4 hover:bg-muted">
                  <span className="mt-0.5 shrink-0" title={q.status === "correct" ? "Got it right" : q.status === "incorrect" ? "Got it wrong" : "Not seen yet"}>
                    {q.status === "correct" ? <Check className="size-4" /> : q.status === "incorrect" ? <X className="size-4 text-destructive" /> : <Circle className="size-4 text-muted-foreground" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    {/* Only questions this student has already seen show their text, so the bank can't be read page by page. */}
                    <span className="line-clamp-2 text-sm">{q.status === "new" && !q.saved ? `Question ${at + 1}` : preview(q.section === "rw" && q.passage ? q.passage : q.stem ?? "")}</span>
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

      {(page > 1 || hasMore) && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pages">
          {page > 1 ? <Link className="underline" href={`/question-bank?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), page: String(page - 1) })}`}>Previous</Link> : <span />}
          <span className="text-muted-foreground">Page {page}</span>
          {hasMore ? <Link className="underline" href={`/question-bank?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), page: String(page + 1) })}`}>Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
