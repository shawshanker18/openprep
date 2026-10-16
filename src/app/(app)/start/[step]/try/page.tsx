import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { startLessonTry } from "@/server/concepts";
import { scratchProgress } from "@/server/scratch";

/** "Try a question" from a lesson concept: starts a three-question set, then goes to it. */
export default async function TryPage({ params, searchParams }: PageProps<"/start/[step]/try">) {
  const { step: key } = await params;
  const concept = (await searchParams).concept;
  const { userId } = await requireUser();
  const { steps } = await scratchProgress(userId);
  const step = steps.find((s) => s.key === key);
  if (!step || step.kind !== "skill" || typeof concept !== "string" || !concept.trim() || !/^[a-z0-9-]+$/.test(step.key)) notFound();
  const sessionId = await startLessonTry(userId, step.ref, concept.trim().slice(0, 120), `/start/${step.key}`);
  if (!sessionId) redirect(`/start/${step.key}`);
  redirect(`/practice?session=${sessionId}`);
}
