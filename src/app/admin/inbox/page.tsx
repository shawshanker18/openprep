import Link from "next/link";
import { count, desc, eq, inArray, type AnyColumn, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { feedback, questionReports, questions, securityReports } from "@/db/schema";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { requireAdmin, userEmails } from "@/server/admin";
import { cn } from "@/lib/utils";
import { updateRequest } from "./actions";

export const metadata = { title: "Inbox" };

const PER_PAGE = 25;
const TYPES = { feedback: "Feedback", questions: "Question reports", security: "Security reports" } as const;
type Type = keyof typeof TYPES;
const STATUSES = { open: "Open", resolved: "Resolved", dismissed: "Dismissed", all: "All" } as const;
type StatusView = keyof typeof STATUSES;
const STATUS_LABEL: Record<string, string> = { new: "New", in_progress: "In progress", resolved: "Resolved", dismissed: "Dismissed" };
const KIND_LABEL: Record<string, string> = { bug: "Bug", error: "Error", review: "Review", idea: "Idea", other: "Other" };
const REASON_LABEL: Record<string, string> = { wrong_answer: "Answer is wrong", unclear: "Unclear", typo: "Typo or formatting", other: "Something else" };
const when = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }) + " UTC";

function statusWhere(col: AnyColumn, view: StatusView): SQL | undefined {
  return view === "open" ? inArray(col, ["new", "in_progress"]) : view === "all" ? undefined : eq(col, view);
}

/** Status + note form shared by every inbox item. */
function Handle({ type, id, status, note }: { type: Type; id: string; status: string; note: string | null }) {
  return (
    <form action={updateRequest} className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-end">
      <input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">Status
        <select name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-2 text-sm text-foreground">
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">Private note
        <input name="note" defaultValue={note ?? ""} maxLength={2000} placeholder="What was done, or why it's dismissed" className="h-9 rounded-md border bg-background px-2 text-sm text-foreground" />
      </label>
      <Button type="submit" size="sm" variant="outline">Save</Button>
    </form>
  );
}

export default async function AdminInbox({ searchParams }: PageProps<"/admin/inbox">) {
  await requireAdmin();
  const sp = await searchParams;
  const type: Type = sp.type === "questions" || sp.type === "security" ? sp.type : "feedback";
  const view: StatusView = Object.hasOwn(STATUSES, String(sp.status)) ? (sp.status as StatusView) : "open";
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const skip = (page - 1) * PER_PAGE;
  const href = (o: Record<string, string | number | null>) => {
    const q = new URLSearchParams(Object.entries({ type, status: view, page: null, ...o }).filter(([, v]) => v != null && String(v) !== "") as [string, string][]);
    return `/admin/inbox?${q}`;
  };

  const [openCounts] = await Promise.all([Promise.all((Object.keys(TYPES) as Type[]).map(async (t) => {
    const table = t === "feedback" ? feedback : t === "questions" ? questionReports : securityReports;
    const [{ n }] = (await db.select({ n: count() }).from(table).where(inArray(table.status, ["new", "in_progress"]))) as [{ n: number }];
    return [t, n] as const;
  }))]);

  let items: React.ReactNode[] = [];
  let more = false;
  if (type === "feedback") {
    const rows = await db.select().from(feedback).where(statusWhere(feedback.status, view)).orderBy(desc(feedback.createdAt)).limit(PER_PAGE + 1).offset(skip);
    more = rows.length > PER_PAGE;
    const emails = await userEmails(rows.flatMap((r) => (r.userId ? [r.userId] : [])));
    items = rows.slice(0, PER_PAGE).map((r) => (
      <li key={r.id} className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border px-2 py-0.5 font-medium text-foreground">{KIND_LABEL[r.kind] ?? r.kind}</span>
          {r.rating != null && <span aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>}
          <span>{STATUS_LABEL[r.status]}</span><span>·</span><span>{when(r.createdAt)}</span>
          {r.page && <><span>·</span><span>from <code>{r.page}</code></span></>}
        </div>
        <p className="whitespace-pre-wrap break-words">{r.message}</p>
        <p className="text-xs text-muted-foreground">
          {r.userId ? <Link className="underline" href={`/admin/users/${r.userId}`}>{emails.get(r.userId)?.email ?? "Student"}</Link> : "Signed out"}
          {r.contact && <> · contact: {r.contact}</>}
        </p>
        <Handle type="feedback" id={r.id} status={r.status} note={r.adminNote} />
      </li>
    ));
  } else if (type === "questions") {
    const rows = await db.select({ r: questionReports, q: { id: questions.id, skillId: questions.skillId, stem: questions.stemMd, passage: questions.passageMd, answer: questions.answer, explanation: questions.explanationMd, status: questions.status } })
      .from(questionReports).leftJoin(questions, eq(questions.id, questionReports.questionId))
      .where(statusWhere(questionReports.status, view)).orderBy(desc(questionReports.createdAt)).limit(PER_PAGE + 1).offset(skip);
    more = rows.length > PER_PAGE;
    const emails = await userEmails(rows.map((x) => x.r.userId));
    items = rows.slice(0, PER_PAGE).map(({ r, q }) => (
      <li key={r.id} className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border px-2 py-0.5 font-medium text-foreground">{REASON_LABEL[r.reason] ?? r.reason}</span>
          <span>{STATUS_LABEL[r.status]}</span><span>·</span><span>{when(r.createdAt)}</span><span>·</span>
          <span>question <code>{r.questionId}</code>{q ? ` (${SKILL_BY_ID[q.skillId]?.name ?? q.skillId}${q.status !== "active" ? ", retired" : ""})` : " (no longer in the bank)"}</span>
        </div>
        {r.note && <p className="whitespace-pre-wrap break-words">“{r.note}”</p>}
        {q && (
          <details className="rounded-md bg-muted/50 p-3">
            <summary className="cursor-pointer text-xs font-medium">Show the question and its answer</summary>
            <div className="mt-2 flex flex-col gap-2">
              {q.passage && <Markdown className="text-sm">{q.passage}</Markdown>}
              <Markdown className="text-sm">{q.stem}</Markdown>
              <p className="text-xs">Answer: <b>{"choice" in q.answer ? q.answer.choice : q.answer.accepted.join(" or ")}</b></p>
              <Markdown className="text-xs text-muted-foreground">{q.explanation}</Markdown>
            </div>
          </details>
        )}
        <p className="text-xs text-muted-foreground">Reported by <Link className="underline" href={`/admin/users/${r.userId}`}>{emails.get(r.userId)?.email ?? "student"}</Link></p>
        <Handle type="questions" id={r.id} status={r.status} note={r.adminNote} />
      </li>
    ));
  } else {
    const rows = await db.select().from(securityReports).where(statusWhere(securityReports.status, view)).orderBy(desc(securityReports.createdAt)).limit(PER_PAGE + 1).offset(skip);
    more = rows.length > PER_PAGE;
    items = rows.slice(0, PER_PAGE).map((r) => (
      <li key={r.id} className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{STATUS_LABEL[r.status]}</span><span>·</span><span>{when(r.createdAt)}</span><span>·</span><span>IP {r.ip}</span>
          {r.contact && <><span>·</span><span>contact: {r.contact}</span></>}
        </div>
        <p className="whitespace-pre-wrap break-words">{r.message}</p>
        <Handle type="security" id={r.id} status={r.status} note={r.adminNote} />
      </li>
    ));
  }

  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-xs", active ? "bg-primary text-primary-foreground" : "hover:bg-muted");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Inbox</h1>
      <div className="flex flex-wrap gap-2">
        {openCounts.map(([t, n]) => <Link key={t} className={chip(type === t)} href={href({ type: t, status: "open" })}>{TYPES[t]} ({n})</Link>)}
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUSES) as StatusView[]).map((s) => <Link key={s} className={chip(view === s)} href={href({ status: s })}>{STATUSES[s]}</Link>)}
      </div>
      {items.length ? <ul className="flex flex-col gap-3">{items}</ul> : <p className="text-muted-foreground">Nothing here.</p>}
      {(page > 1 || more) && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pages">
          {page > 1 ? <Link className="underline" href={href({ page: page === 2 ? null : page - 1 })}>Newer</Link> : <span />}
          <span className="text-muted-foreground">Page {page}</span>
          {more ? <Link className="underline" href={href({ page: page + 1 })}>Older</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
