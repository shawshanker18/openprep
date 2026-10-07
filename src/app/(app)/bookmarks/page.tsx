import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { revalidatePath } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { db } from "@/db";
import { attempts, bookmarks, questions } from "@/db/schema";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { requireUser } from "@/server/auth";
import { internalId, publicId,questionMarkdown } from "@/server/questions";
import { BookmarkNote } from "./bookmark-note";

export const metadata = { title: "Saved questions" };

async function removeBookmark(pub: string) {
  "use server";
  const { userId } = await requireUser();
  const questionId = await internalId(pub, userId);
  if (questionId) await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.questionId, questionId)));
  revalidatePath("/bookmarks");
}

export default async function BookmarksPage({searchParams}:PageProps<"/bookmarks">) {
  const sp=await searchParams;
  const page=Math.min(100000,Math.max(1,Number.isSafeInteger(Number(sp.page))?Number(sp.page):1));
  const { userId, profile } = await requireUser();
  const rows = await db.select({
    id: questions.id, skillId: questions.skillId, stem: questions.stemMd, passage: questions.passageMd,choices:questions.choices,
    explanation: questions.explanationMd, answer: questions.answer, at: bookmarks.createdAt, note: bookmarks.note,
    // Answers are shown only for questions this student has already answered (never leak unseen answers).
    answered: sql<boolean>`exists(select 1 from ${attempts} a where a.user_id = ${userId} and a.question_id = ${questions.id})`,
  }).from(bookmarks).innerJoin(questions, eq(questions.id, bookmarks.questionId))
    .where(and(eq(bookmarks.userId, userId), sql`(exists(select 1 from question_exposures e where e.user_id=${userId} and e.question_id=${questions.id}) or exists(select 1 from attempts a where a.user_id=${userId} and a.question_id=${questions.id}) or exists(select 1 from question_serves s where s.user_id=${userId} and s.question_id=${questions.id}))`)).orderBy(desc(bookmarks.createdAt),bookmarks.questionId).limit(11).offset((page-1)*10);
  const more=rows.length>10;
  const shown=rows.slice(0,10).map(r=>{
    const q={id:r.id,stemMd:r.stem,passageMd:r.passage,choices:r.choices};
    return {...r,stem:questionMarkdown(q,r.stem,userId),passage:r.passage?questionMarkdown(q,r.passage,userId):null, choices:r.choices?.map(c=>({...c,md:questionMarkdown(q,c.md,userId)}))??null};
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Saved questions</h1>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">Nothing saved yet. Tap the bookmark icon on any practice question to save it here.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((r) => (
            <li key={publicId(r.id, userId)} className="flex flex-col gap-2 rounded-lg border p-4 text-sm">
              {r.passage && <Markdown className="text-muted-foreground">{r.passage}</Markdown>}
              <Markdown>{r.stem}</Markdown>
              {r.choices?.length ? <ol aria-label="Answer choices" className="flex flex-col gap-2">{r.choices.map(c=><li key={c.id} className="flex min-w-0 items-start gap-3 rounded-lg border p-3"><span className="font-semibold">{c.id}</span><Markdown className="min-w-0 flex-1">{c.md}</Markdown></li>)}</ol> : <p className="text-muted-foreground">Student-produced response</p>}
              <BookmarkNote questionId={publicId(r.id, userId)} note={r.note} />
              {r.answered && (
                <details>
                  <summary className="cursor-pointer text-muted-foreground">
                    Show answer · {"choice" in r.answer ? r.answer.choice : r.answer.accepted.join(" or ")}
                  </summary>
                  <Markdown className="mt-2">{r.explanation}</Markdown>
                </details>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Link className="text-xs underline" href={`/skills/${r.skillId}`}>{SKILL_BY_ID[r.skillId]?.name}</Link>
                <span className="text-xs text-muted-foreground">saved {formatDate(r.at, profile.timezone)}</span>
                <span className="flex-1" />
                <Button size="sm" variant="outline" render={<Link href={`/practice?skill=${r.skillId}`} />}>Practice this skill</Button>
                <Button size="sm" render={<Link href={`/practice?mode=list&ids=${publicId(r.id, userId)}&from=${encodeURIComponent(`/bookmarks?page=${page}`)}`} />}>Practice this question</Button>
                <form action={removeBookmark.bind(null, publicId(r.id, userId))}><Button size="sm" variant="ghost" type="submit">Remove</Button></form>
              </div>
            </li>
          ))}
        </ul>
      )}
      {(page>1 || more) && <nav aria-label="Saved question pages" className="flex gap-3">
        {page>1 && <Button variant="outline" render={<Link href={`/bookmarks?page=${page-1}`} />}>Previous</Button>}
        <span className="self-center text-sm">Page {page}</span>
        {more && <Button variant="outline" render={<Link href={`/bookmarks?page=${page+1}`} />}>Next</Button>}
      </nav>}
    </div>
  );
}
