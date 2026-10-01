import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getDiagnostic } from "@/server/diagnostic";
import { DiagnosticRunner } from "./diagnostic-runner";

// Phase F adds the timed TestRunner for the other test kinds.
export default async function TestPage({ params }: PageProps<"/test/[sessionId]">) {
  const { sessionId } = await params;
  const { userId } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const d = await getDiagnostic(userId, sessionId);
  if (!d) notFound();
  if (d.status !== "in_progress" || !d.current) redirect(`/test/${sessionId}/results`);
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <DiagnosticRunner sessionId={sessionId} initial={d.current} initialIndex={d.index} />
    </main>
  );
}
