import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { testSessions } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { getDiagnostic } from "@/server/diagnostic";
import { getTestState } from "@/server/tests";
import { DiagnosticRunner } from "./diagnostic-runner";
import { TestRunner } from "./test-runner";

export default async function TestPage({ params }: PageProps<"/test/[sessionId]">) {
  const { sessionId } = await params;
  const { userId } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const [s] = await db.select({ kind: testSessions.kind }).from(testSessions)
    .where(and(eq(testSessions.id, sessionId), eq(testSessions.userId, userId)));
  if (!s) notFound();

  if (s.kind === "diagnostic") {
    const d = await getDiagnostic(userId, sessionId);
    if (!d || d.status !== "in_progress" || !d.current) redirect(`/test/${sessionId}/results`);
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <DiagnosticRunner sessionId={sessionId} initial={d.current} initialIndex={d.index} />
      </main>
    );
  }

  const st = await getTestState(userId, sessionId);
  if (st.kind !== "module") redirect(`/test/${sessionId}/results`);
  return (
    <main className="w-full">
      <TestRunner key={st.module.id} sessionId={sessionId} module={st.module} items={st.items}
        serverNow={st.serverNow} breakBefore={st.breakBefore} />
    </main>
  );
}
