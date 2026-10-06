import {DeliveryBlockedView} from "@/components/delivery-blocked";
import { DeliveryBlocked } from "@/server/delivery-policy";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { testSessions } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { getTestResult } from "@/server/tests";
import { TestResults } from "./test-results";
import { ReviewItem } from "./review-item";

export const metadata = { title: "Results" };

async function loadPage({ params, searchParams }: PageProps<"/test/[sessionId]/results">) {
  const { sessionId } = await params;
  const { userId, profile } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const [s] = await db.select().from(testSessions).where(and(eq(testSessions.id, sessionId), eq(testSessions.userId, userId)));
  if (!s) notFound();
  if (s.status === "in_progress") redirect(`/test/${sessionId}`);
  if (s.kind !== "diagnostic") return <TestResults data={(await getTestResult(userId, sessionId))!} timeZone={profile.timezone} />;

  const sp = await searchParams;
  const showMistakes = sp.review === "mistakes" && s.status === "completed";
  // Fetch and reveal saved answers only after the student explicitly opens the review.
  const review = showMistakes ? await getTestResult(userId, sessionId) : null;
  const mistakes = review?.items.map((item, index) => ({ item, number: index + 1 })).filter(({ item }) => !item.correct) ?? [];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">{showMistakes ? "Diagnostic mistakes" : s.status === "completed" ? "Diagnostic complete" : "Diagnostic ended"}</h1>
      {!showMistakes && <p className="text-muted-foreground">Your saved answers are available in Tests → History. You can review mistakes now or come back later.</p>}
      {showMistakes && (
        <section className="flex flex-col gap-3" aria-label="Saved diagnostic mistakes">
          <p className="text-sm text-muted-foreground">{mistakes.length ? "Open a question to see your answer and the correct answer." : "No mistakes in this diagnostic."}</p>
          {mistakes.map(({ item, number }) => <ReviewItem key={`${item.moduleIdx}-${item.position}`} n={number}
            q={item.question} response={item.response} correct={item.correct} timeMs={item.timeMs}
            attemptId={item.attemptId} mistakeType={item.mistakeType} initiallyOpen={false} />)}
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        {!showMistakes && s.status === "completed" && <Button render={<Link href={`/test/${sessionId}/results?review=mistakes`} />}>Review mistakes</Button>}
        <Button variant={showMistakes ? "default" : "outline"} render={<Link href="/dashboard" />}>Continue to dashboard</Button>
        <Button variant="outline" render={<Link href="/tests#history" />}>Test history</Button>
      </div>
    </main>
  );
}

export default async function ResultsPage(props:PageProps<"/test/[sessionId]/results">) {
  let content, message:string|undefined;
  try { content=await loadPage(props); }
  catch(e) { if(e instanceof DeliveryBlocked) message=e.message; else throw e; }
  return message ? <DeliveryBlockedView message={message} /> : content;
}
