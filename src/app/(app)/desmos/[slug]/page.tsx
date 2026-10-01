import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { lessonProgress } from "@/db/schema";
import { DesmosCalculator } from "@/components/desmos-panel";
import { Markdown } from "@/components/markdown";
import { requireUser } from "@/server/auth";
import { completeBlock } from "@/server/daily";
import { listDesmosLessons } from "@/server/lessons";

export default async function DesmosLessonPage({ params, searchParams }: PageProps<"/desmos/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const lesson = (await listDesmosLessons()).find((l) => l.slug === slug);
  if (!lesson) notFound();
  const { userId, profile } = await requireUser();
  // Opening the lesson marks it seen and completes the plan block that linked here.
  await db.insert(lessonProgress).values({ userId, skillId: `desmos:${slug}` }).onConflictDoNothing();
  const block = Number(sp.block);
  if (Number.isInteger(block) && block >= 0) await completeBlock(userId, profile, block);
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
