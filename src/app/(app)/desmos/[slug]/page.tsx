import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { lessonProgress } from "@/db/schema";
import { DesmosCalculator } from "@/components/desmos-panel";
import { LessonWorkspace } from "@/components/lesson-workspace";
import { Markdown } from "@/components/markdown";
import { requireUser } from "@/server/auth";
import { listDesmosLessons } from "@/server/lessons";

export async function generateMetadata({ params }: PageProps<"/desmos/[slug]">) {
  const { slug } = await params;
  return { title: (await listDesmosLessons()).find((l) => l.slug === slug)?.title ?? "Desmos lesson" };
}

export default async function DesmosLessonPage({ params }: PageProps<"/desmos/[slug]">) {
  const { slug } = await params;
  const lessons = await listDesmosLessons();
  const index = lessons.findIndex((l) => l.slug === slug);
  const lesson = index >= 0 ? lessons[index] : undefined;
  if (!lesson) notFound();
  const { userId } = await requireUser();
  // Opening the lesson records it (with today's date, so a Desmos block in today's plan counts as done).
  await db.insert(lessonProgress).values({ userId, skillId: `desmos:${slug}` })
    .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.skillId], set: { completedAt: new Date() } });
  return (
    <LessonWorkspace title={lesson.title} slug={slug} calculator={<DesmosCalculator expressions={lesson.expressions} className="h-[calc(100vh-9rem)] min-h-[600px]" />}>
      <Markdown className="text-[15px]">{lesson.md}</Markdown>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        {index > 0 ? <Button variant="outline" render={<Link href={`/desmos/${lessons[index - 1]!.slug}`} />}>Previous lesson</Button> : <span />}
        <Button variant="outline" render={<Link href="/practice?mode=smart" />}>Practice math now</Button>
        {index >= 0 && index < lessons.length - 1 ? <Button render={<Link href={`/desmos/${lessons[index + 1]!.slug}`} />}>Next lesson</Button> : <span />}
      </div>
    </LessonWorkspace>
  );
}
