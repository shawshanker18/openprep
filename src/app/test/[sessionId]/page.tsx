import {DeliveryBlockedView} from "@/components/delivery-blocked";
import { DeliveryBlocked } from "@/server/delivery-policy";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { testSessions } from "@/db/schema";
import { getAuthUser, requireUser } from "@/server/auth";
import { safely } from "@/lib/safely";
import { getDiagnostic } from "@/server/diagnostic";
import { getTestState } from "@/server/tests";
import { DiagnosticRunner } from "./diagnostic-runner";
import { TestRunner } from "./test-runner";

export const metadata = { title: "Test" };

async function loadPage({ params }: PageProps<"/test/[sessionId]">) {
  const { sessionId } = await params;
  const { userId } = await requireUser();
  const studentName = (await safely(() => getAuthUser(), null))?.name ?? undefined;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const [s] = await db.select({ kind: testSessions.kind, config: testSessions.config, status: testSessions.status }).from(testSessions)
    .where(and(eq(testSessions.id, sessionId), eq(testSessions.userId, userId)));
  if (!s) notFound();

  if (s.kind === "diagnostic") {
    const d = await getDiagnostic(userId, sessionId);
    if (!d || d.status !== "in_progress" || !d.current) redirect(`/test/${sessionId}/results`);
    return (
      <main className="w-full px-4 py-8 md:px-8">
        <DiagnosticRunner key={d.current.id} sessionId={sessionId} initial={d.current} initialIndex={d.index} studentName={studentName} />
      </main>
    );
  }

  const st = await getTestState(userId, sessionId);
  if (st.kind !== "module") redirect(`/test/${sessionId}/results`);
  return (
    <main className="w-full">
      <TestRunner key={st.module.id} userId={userId} sessionId={sessionId} module={st.module} items={st.items}
        serverNow={st.serverNow} breakBefore={st.breakBefore} heading={st.session.title} studentName={studentName} />
    </main>
  );
}

export default async function TestPage(props:PageProps<"/test/[sessionId]">) {
  let content, message:string|undefined;
  try { content=await loadPage(props); }
  catch(e) { if(e instanceof DeliveryBlocked) message=e.message; else throw e; }
  return message ? <DeliveryBlockedView message={message} /> : content;
}
