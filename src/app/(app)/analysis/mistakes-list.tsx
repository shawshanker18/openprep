import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { and, desc, eq, lte, notExists, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { db } from "@/db";
import { attempts, questions, reviewItems, testItems, testModules, testSessions } from "@/db/schema";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { publicId, questionMarkdown } from "@/server/questions";

const PER_PAGE = 30;

export async function MistakesList({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const view = sp.view === "due" ? "due" : "all";
  const section = sp.section === "rw" || sp.section === "math" ? sp.section : null;
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const { userId, profile } = await requireUser();
  const now = new Date();

  // Latest wrong attempt per question, joined to its review-queue state; newest first, a page at a time.
  const latest = db.selectDistinctOn([attempts.questionId], {
    id: attempts.questionId, skillId: attempts.skillId, section: questions.section, stem: sql<string>`concat_ws(chr(10) || chr(10), ${questions.passageMd}, ${questions.stemMd})`.as("stem"),
    explanation: questions.explanationMd, response: attempts.response, answer: questions.answer, choices: questions.choices, rationale: questions.choiceRationales, at: attempts.createdAt, dueAt: reviewItems.dueAt,
  }).from(attempts)
    .innerJoin(questions, eq(questions.id, attempts.questionId))
    .leftJoin(reviewItems, and(eq(reviewItems.userId, userId), eq(reviewItems.questionId, attempts.questionId)))
    .where(and(
      eq(attempts.userId, userId), eq(attempts.correct, false),
      notExists(db.select({ id: testItems.questionId }).from(testItems)
        .innerJoin(testModules, eq(testModules.id, testItems.moduleId))
        .innerJoin(testSessions, eq(testSessions.id, testModules.sessionId))
        .where(and(eq(testItems.questionId, attempts.questionId), eq(testSessions.userId, userId), eq(testSessions.status, "in_progress")))),
      section ? eq(questions.section, section) : undefined,
      view === "due" ? lte(reviewItems.dueAt, now) : undefined,
    ))
    .orderBy(attempts.questionId, desc(attempts.createdAt)).as("m");
  const found = await db.select().from(latest).orderBy(desc(latest.at)).limit(PER_PAGE + 1).offset((page - 1) * PER_PAGE);
  const rows = found.slice(0, PER_PAGE);
  const more = found.length > PER_PAGE;
  const [{ due }] = (await db.select({ due: sql<number>`count(*)::int` }).from(reviewItems)
    .where(and(eq(reviewItems.userId, userId), lte(reviewItems.dueAt, now)))) as [{ due: number }];

  const href = (o: Record<string, string | null>) => {
    const q = new URLSearchParams(Object.entries({ view, section, page: null, ...o }).filter(([, v]) => v) as [string, string][]);
    return `/analysis?tab=mistakes&${q}`;
  };
  const chip = (active: boolean) => cn("text-sm underline-offset-4 hover:underline", active ? "font-medium underline" : "text-muted-foreground");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Mistakes</h2>
        {due > 0 && <Button render={<Link href="/practice?mode=review" />}>Review {due} due</Button>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link className={chip(view === "due")} href={href({ view: "due" })}>Due now ({due})</Link>
        <Link className={chip(view === "all")} href={href({ view: "all" })}>All</Link>
        <span className="text-muted-foreground" aria-hidden>|</span>
        {(["rw", "math"] as const).map((s) => <Link key={s} className={chip(section === s)} href={href({ section: section === s ? null : s })}>{s === "rw" ? "R&W" : "Math"}</Link>)}

      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{view === "due" ? "Nothing due right now." : "No mistakes match these filters."}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((m) => { const fix = (md: string) => questionMarkdown({ id: m.id, stemMd: "", passageMd: null, choices: null }, md, userId); return (
            <li key={publicId(m.id,userId)} className="flex flex-col gap-1 rounded-md border p-3 text-sm">
              <Markdown>{fix(m.stem)}</Markdown>
              <p>Your answer: <b>{m.response ?? "Not answered"}</b> · Correct answer: <b>{"choice" in m.answer ? m.answer.choice : m.answer.accepted.join(" or ")}</b></p>
              {"choice" in m.answer && Array.isArray(m.choices) && <Markdown>{fix(m.choices.find(c => "choice" in m.answer && c.id === m.answer.choice)?.md ?? "")}</Markdown>}
              {m.response && m.rationale?.[m.response] && <Markdown>{fix(m.rationale[m.response]!)}</Markdown>}
              {m.explanation && <Markdown>{fix(`**Why:** ${m.explanation}`)}</Markdown>}
              <span className="text-xs text-muted-foreground">
                <Link className="underline" href={`/skills/${m.skillId}?tab=mistakes`}>{SKILL_BY_ID[m.skillId]?.name}</Link>
                {" · "}missed {formatDate(m.at, profile.timezone)}
                {" · "}{m.dueAt ? (m.dueAt <= now ? "due now" : `review ${formatDate(m.dueAt, profile.timezone)}`) : "cleared"}
              </span>
            </li>
          );})}
        </ul>
      )}
      {(page > 1 || more) && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pages">
          {page > 1 ? <Link className="underline" href={href({ page: page === 2 ? null : String(page - 1) })}>Newer</Link> : <span />}
          <span className="text-muted-foreground">Page {page}</span>
          {more ? <Link className="underline" href={href({ page: String(page + 1) })}>Older</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
