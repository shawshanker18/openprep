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
import { internalId, publicId } from "@/server/questions";

export const metadata = { title: "Saved questions" };

async function removeBookmark(pub: string) {
  "use server";
  const { userId } = await requireUser();
  const questionId = await internalId(pub);
  if (questionId) await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.questionId, questionId)));
  revalidatePath("/bookmarks");
}

export default async function BookmarksPage() {
  const { userId, profile } = await requireUser();
  const rows = await db.select({
    id: questions.id, skillId: questions.skillId, stem: questions.stemMd, passage: questions.passageMd,
    explanation: questions.explanationMd, answer: questions.answer, at: bookmarks.createdAt,
    // Answers are shown only for questions this student has already answered (never leak unseen answers).
    answered: sql<boolean>`exists(select 1 from ${attempts} a where a.user_id = ${userId} and a.question_id = ${questions.id})`,
  }).from(bookmarks).innerJoin(questions, eq(questions.id, bookmarks.questionId))
    .where(eq(bookmarks.userId, userId)).orderBy(desc(bookmarks.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Saved questions</h1>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">Nothing saved yet. Tap the bookmark icon on any practice question to save it here.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={publicId(r.id)} className="flex flex-col gap-2 rounded-lg border p-4 text-sm">
              {r.passage && <Markdown className="line-clamp-3 text-muted-foreground">{r.passage}</Markdown>}
              <Markdown>{r.stem}</Markdown>
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
                <form action={removeBookmark.bind(null, publicId(r.id))}><Button size="sm" variant="ghost" type="submit">Remove</Button></form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
