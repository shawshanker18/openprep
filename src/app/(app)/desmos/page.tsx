import Link from "next/link";
import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { lessonProgress } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { listDesmosLessons } from "@/server/lessons";

export const metadata = { title: "Desmos lessons" };

export default async function DesmosPage() {
  const { userId } = await requireUser();
  const [lessons, opened] = await Promise.all([
    listDesmosLessons(),
    db.select({ id: lessonProgress.skillId }).from(lessonProgress).where(and(eq(lessonProgress.userId, userId), like(lessonProgress.skillId, "desmos:%"))),
  ]);
  const done = new Set(opened.map((o) => o.id));
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Desmos on the SAT</h1>
        <p className="text-sm text-muted-foreground">Graph equations, find intersections, and use tables and regression.</p>
      </div>
      {lessons.length === 0 ? <p className="text-muted-foreground">No calculator lessons are available.</p> : (
        <ol className="flex flex-col gap-2">
          {lessons.map((l, i) => (
            <li key={l.slug}>
              <Link href={`/desmos/${l.slug}`} className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted">
                <span>{i + 1}. {l.title}</span>
                {done.has(`desmos:${l.slug}`) && <span className="text-muted-foreground">✓ opened</span>}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
