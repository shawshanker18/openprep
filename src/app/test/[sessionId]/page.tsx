import {DeliveryBlockedView} from "@/components/delivery-blocked";
import { DeliveryBlocked } from "@/server/delivery-policy";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { testSessions } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { getDiagnostic } from "@/server/diagnostic";
import { getTestState } from "@/server/tests";
import { appKeyHash, mayContinue } from "@/server/lockdown";
import { DiagnosticRunner } from "./diagnostic-runner";
import { TestRunner } from "./test-runner";
import { Button } from "@/components/ui/button";
import { abandon, endDiagnostic } from "./actions";

export const metadata = { title: "Test" };

async function loadPage({ params }: PageProps<"/test/[sessionId]">) {
  const { sessionId } = await params;
  const { userId } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const [s] = await db.select({ kind: testSessions.kind, config: testSessions.config, status: testSessions.status }).from(testSessions)
    .where(and(eq(testSessions.id, sessionId), eq(testSessions.userId, userId)));
  if (!s) notFound();

  // Started in an app's lockdown mode: it can't be carried on in a plain browser, only in the app (or ended).
  if (s.status === "in_progress" && !(await mayContinue(s.config))) {
    return (
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">This test is in lockdown mode</h1>
        <p className="text-muted-foreground">
          {(await appKeyHash())
            ? "You started it in the OpenPrep app on another device, so it can only be continued there. Carry on on that device, or end the test here."
            : "You started it in the OpenPrep app, so it can only be continued there. Open the app to carry on, or end the test here."}
        </p>
        <form action={(s.kind === "diagnostic" ? endDiagnostic : abandon).bind(null, sessionId)}><Button type="submit" variant="outline">End test</Button></form>
      </main>
    );
  }

  if (s.kind === "diagnostic") {
    const d = await getDiagnostic(userId, sessionId);
    if (!d || d.status !== "in_progress" || !d.current) redirect(`/test/${sessionId}/results`);
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <DiagnosticRunner key={d.current.id} sessionId={sessionId} initial={d.current} initialIndex={d.index} />
      </main>
    );
  }

  const st = await getTestState(userId, sessionId);
  if (st.kind !== "module") redirect(`/test/${sessionId}/results`);
  return (
    <main className="w-full">
      <TestRunner key={st.module.id} userId={userId} sessionId={sessionId} module={st.module} items={st.items}
        serverNow={st.serverNow} breakBefore={st.breakBefore} heading={st.session.title} />
    </main>
  );
}

export default async function TestPage(props:PageProps<"/test/[sessionId]">) {
  let content, message:string|undefined;
  try { content=await loadPage(props); }
  catch(e) { if(e instanceof DeliveryBlocked) message=e.message; else throw e; }
  return message ? <DeliveryBlockedView message={message} /> : content;
}
