import {DeliveryBlockedView} from "@/components/delivery-blocked";
import { DeliveryBlocked } from "@/server/delivery-policy";
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
import { skillsByPriority } from "@/server/plan";
import { SKILL_BY_ID } from "@/content/taxonomy";

export const metadata = { title: "Results" };

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
async function loadPage({ params }: PageProps<"/test/[sessionId]/results">) {
  const { sessionId } = await params;
  const { userId, profile } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const [s] = await db.select().from(testSessions).where(and(eq(testSessions.id, sessionId), eq(testSessions.userId, userId)));
  if (!s) notFound();
  if (s.status === "in_progress") redirect(`/test/${sessionId}`);
  if (s.kind !== "diagnostic") return <TestResults data={(await getTestResult(userId, sessionId))!} timeZone={profile.timezone} />;

  const [{ skills, estimate }, ranked] = await Promise.all([getSkillSummary(userId), skillsByPriority(userId, profile)]);
  // Personalized starting curriculum (plan §24.6): biggest gains first; skip what's already strong.
  const path = ranked.slice(0, 5).map((r) => skills.find((k) => k.id === r.skillId)!).filter(Boolean);
  const skip = skills.filter((k) => k.status === "strong" || k.status === "mastered");
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
        <h1 className="text-3xl font-semibold tabular-nums">Estimated {estimate.total.lo} to {estimate.total.hi}</h1>
        <p className="text-muted-foreground">
          Reading &amp; Writing ≈ {estimate.rw.score} · Math ≈ {estimate.math.score}. This is an estimate from a short diagnostic;
          it narrows as you practice.
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

      <section className="flex flex-col gap-3 rounded-lg border p-4">
        <h3 className="font-medium">Your starting path</h3>
        <p className="text-sm text-muted-foreground">Ordered by how many points each skill can add toward your target. Your daily plan follows this order.</p>
        <ol className="flex flex-col gap-2 text-sm">
          {path.map((k, i) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>{i + 1}. {k.name} <span className="text-muted-foreground">· {k.status === "unknown" ? "not measured" : `${k.mastery}%`}</span></span>
              <span className="flex gap-3">
                <Link className="underline" href={`/start/${k.id}`}>Learn</Link>
                <Link className="underline" href={`/practice?skill=${k.id}`}>Practice</Link>
              </span>
            </li>
          ))}
        </ol>
        {skip.length > 0 && (
          <p className="text-sm text-muted-foreground">
            You can skip for now: {skip.map((k) => SKILL_BY_ID[k.id]?.name).join(", ")}.
          </p>
        )}
      </section>

      {unmeasured.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {unmeasured.length} skills weren&apos;t measured yet. Practice will fill them in.
        </p>
      )}
      <div><Button size="lg" render={<Link href="/dashboard" />}>See my plan</Button></div>
    </main>
  );
}

export default async function ResultsPage(props:PageProps<"/test/[sessionId]/results">) {
  let content, message:string|undefined;
  try { content=await loadPage(props); }
  catch(e) { if(e instanceof DeliveryBlocked) message=e.message; else throw e; }
  return message ? <DeliveryBlockedView message={message} /> : content;
}
