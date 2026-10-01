import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { testSessions } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { getSkillSummary, type SkillSummary } from "@/server/analytics";
import { getTestResult } from "@/server/tests";
import { TestResults } from "./test-results";

const SELF = ["Don't know", "A little", "Know it", "Very confident"];

function SkillList({ title, skills }: { title: string; skills: SkillSummary[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {skills.length ? (
        <ul className="flex flex-col gap-1 text-sm">
          {skills.map((s) => (
            <li key={s.id} className="flex justify-between gap-2"><span>{s.name}</span><span className="tabular-nums text-muted-foreground">{s.mastery}%</span></li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">None yet</p>}
    </div>
  );
}

// Diagnostic → starting-profile view (spec 04 §2); every other kind → test results (spec 04 §5.3).
export default async function ResultsPage({ params }: PageProps<"/test/[sessionId]/results">) {
  const { sessionId } = await params;
  const { userId } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const [s] = await db.select().from(testSessions).where(and(eq(testSessions.id, sessionId), eq(testSessions.userId, userId)));
  if (!s) notFound();
  if (s.status === "in_progress") redirect(`/test/${sessionId}`);
  if (s.kind !== "diagnostic") return <TestResults data={(await getTestResult(userId, sessionId))!} />;

  const { skills, estimate } = await getSkillSummary(userId);
  const measured = skills.filter((k) => k.status !== "unknown").sort((a, b) => b.mastery - a.mastery);
  const strong = measured.filter((k) => k.status === "strong" || k.status === "mastered");
  const developing = measured.filter((k) => k.status === "developing");
  const weak = measured.filter((k) => k.status === "weak");
  const unmeasured = skills.filter((k) => k.status === "unknown");
  const callouts = skills.filter((k) => k.selfRating != null && k.status !== "unknown" &&
    ((k.selfRating >= 2 && k.mastery < 45) || (k.selfRating <= 1 && k.mastery >= 70)));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <div>
        <p className="text-sm text-muted-foreground">Your starting profile</p>
        <h1 className="text-3xl font-semibold tabular-nums">Estimated {estimate.total.lo}–{estimate.total.hi}</h1>
        <p className="text-muted-foreground">
          Reading &amp; Writing ≈ {estimate.rw.score} · Math ≈ {estimate.math.score}. This is an estimate from a short diagnostic;
          it narrows as you practise.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <SkillList title="Strong" skills={strong} />
        <SkillList title="Developing" skills={developing} />
        <SkillList title="Needs work" skills={weak} />
      </div>

      {callouts.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border p-4 text-sm">
          <h3 className="font-medium">You vs. the diagnostic</h3>
          {callouts.map((k) => (
            <p key={k.id}>
              You rated <b>{k.name}</b> “{SELF[k.selfRating!]}”; the diagnostic suggests
              {k.mastery < 45 ? " it needs work." : " you're stronger than you think."}
            </p>
          ))}
        </div>
      )}

      {unmeasured.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {unmeasured.length} skills weren&apos;t measured yet — practice will fill them in.
        </p>
      )}
      <div><Button size="lg" render={<Link href="/dashboard" />}>See my plan</Button></div>
    </main>
  );
}
