import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { lessonProgress } from "@/db/schema";
import { DesmosCalculator } from "@/components/desmos-panel";
import { Markdown } from "@/components/markdown";
import { requireUser } from "@/server/auth";
import { listDesmosLessons } from "@/server/lessons";

export async function generateMetadata({ params }: PageProps<"/desmos/[slug]">) {
  const { slug } = await params;
  return { title: (await listDesmosLessons()).find((l) => l.slug === slug)?.title ?? "Desmos lesson" };
}

export default async function DesmosLessonPage({ params }: PageProps<"/desmos/[slug]">) {
  const { slug } = await params;
  const lesson = (await listDesmosLessons()).find((l) => l.slug === slug);
  if (!lesson) notFound();
  const { userId } = await requireUser();
  // Opening the lesson records it (with today's date, so a Desmos block in today's plan counts as done).
  await db.insert(lessonProgress).values({ userId, skillId: `desmos:${slug}` })
    .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.skillId], set: { completedAt: new Date() } });
  return (
    <div className="flex flex-col gap-6">
      <Link href="/desmos" className="text-sm text-muted-foreground">← Desmos lessons</Link>
      <h1 className="text-2xl font-semibold">{lesson.title}</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <Markdown className="text-[15px]">{lesson.md}</Markdown>
        <DesmosCalculator expressions={lesson.expressions} className="h-[28rem]" />
      </div>
    </div>
  );
}
