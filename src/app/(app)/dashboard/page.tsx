import Link from "next/link";
import { listPracticeSessions } from "@/server/practice-sessions";
import { Button } from "@/components/ui/button";
import { MasteryBar } from "@/components/mastery-bar";
import { DiagnosticSuggestion } from "@/components/diagnostic-gate";
import { diagnosticPending, getAuthUser, requireUser } from "@/server/auth";
import { getDashboard } from "@/server/daily";
import { getSkillSummary } from "@/server/analytics";
import { homeData } from "@/server/home";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { bestTestDate, predictedScore, readyBy } from "@/engine/plan";
import { formatDate } from "@/lib/dates";
import { publicStats } from "@/server/public-stats";

export const metadata = { title: "Home" };

const KIND: Record<string, string> = { full: "Full practice test", section: "Section test", module: "Single module", mini: "Mini test", weakness: "Weakness test", custom: "Custom test" };

/** One number at the top of the dashboard. Missing data links to where the student sets it. */
function Stat({ label, value, sub, href, warn, className = "" }: { label: string; value: React.ReactNode; sub?: React.ReactNode; href?: string; warn?: boolean; className?: string }) {
  const body = (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-xl font-semibold tabular-nums sm:text-2xl ${href ? "underline decoration-dotted underline-offset-4" : ""}`}>{value}</span>
      {sub && <span className={`text-xs ${warn ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>{sub}</span>}
    </>
  );
  const cls = `flex min-w-0 flex-col gap-1 rounded-xl border p-4 ${className}`;
  return href ? <Link href={href} className={`${cls} hover:bg-muted`}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-3 rounded-xl border p-5 ${className}`}>
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

/** A place to pick up from: what it is, one line of context, one button. */
function Resume({ title, detail, href, action }: { title: string; detail: string; href: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0"><p className="truncate font-medium">{title}</p><p className="truncate text-sm text-muted-foreground">{detail}</p></div>
      <Button size="sm" variant="outline" className="shrink-0" render={<Link href={href} />}>{action}</Button>
    </div>
  );
}

function greeting(timeZone: string) {
  const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hourCycle: "h23", timeZone }));
  return h < 5 ? "Good late night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const ago = (d: Date, now = new Date()) => {
  const m = Math.round((now.getTime() - d.getTime()) / 60000);
  return m < 60 ? `${Math.max(1, m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} day${Math.round(m / 1440) === 1 ? "" : "s"} ago`;
};

export default async function DashboardPage() {
  const [{ userId, profile }, user] = await Promise.all([requireUser(), getAuthUser()]);
  const first = user?.name?.split(" ")[0];
  const hello = <h1 className="text-2xl font-semibold">{greeting(profile.timezone)}{first ? `, ${first}` : ""}</h1>;
  const [d, summary, home] = await Promise.all([getDashboard(userId, profile), getSkillSummary(userId), homeData(userId)]);
  const community = await publicStats().catch(() => null);

  const hasEvidence = summary.skills.some((skill) => skill.n > 0);

  // The five numbers.
  const ready = hasEvidence && profile.targetScore ? readyBy({ estimate: d.estimate.total, target: profile.targetScore,
    minutesPerDay: profile.minutesPerDay, daysPerWeek: profile.daysPerWeek, now: new Date() }) : null;
  const month = (dt: Date) => dt.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: profile.timezone });
  const testDay = profile.testDate ? new Date(`${profile.testDate}T12:00:00Z`) : null;
  const best = hasEvidence && profile.targetScore ? bestTestDate(ready, new Date()) : null;
  const tooSoon = !!(best && !best.capped && testDay && testDay < best.date);
  const upcoming = testDay && d.daysLeft != null && d.daysLeft >= 0;
  const predicted = hasEvidence && upcoming ? predictedScore({ estimate: d.estimate.total, minutesPerDay: profile.minutesPerDay, daysPerWeek: profile.daysPerWeek, daysLeft: d.daysLeft! }) : null;

  const savedPractice=(await listPracticeSessions(userId)).find(s=>s.status==="active");

  // Where you left off, most urgent first.
  const resume: { title: string; detail: string; href: string; action: string }[] = [];
  if (home.openTest) resume.push({ title: KIND[home.openTest.kind] ?? "Test", detail: `In progress · started ${formatDate(home.openTest.startedAt, profile.timezone, true)}`, href: `/test/${home.openTest.id}`, action: "Resume" });
  if(savedPractice) resume.push({title:savedPractice.title,detail:"Saved practice session",href:`/practice?session=${savedPractice.id}`,action:"Resume"});
  if (!savedPractice && home.lastPractice) resume.push({ title: SKILL_BY_ID[home.lastPractice.skillId]?.name ?? "Practice", detail: `Last practiced ${ago(home.lastPractice.at)}`, href: `/practice?skill=${home.lastPractice.skillId}`, action: "Continue" });
  if (home.course.next) resume.push({ title: home.course.next.title, detail: `Start from scratch · ${home.course.done} of ${home.course.total} done`, href: `/start/${home.course.next.key}`, action: "Continue" });
  if (d.dueReviews > 0) resume.push({ title: "Mistakes to review", detail: `${d.dueReviews} due now`, href: "/practice?mode=review", action: "Review" });
  const primary = resume[0] ?? { href: "/practice", action: "Start practicing" };

  // Skills: weakest measured ones to work on, strongest to keep.
  const measured = summary.skills.filter((k) => k.status !== "unknown");
  const weakest = [...measured].sort((a, b) => a.mastery - b.mastery).slice(0, 4);
  const sectionMastery = (sec: "math" | "rw") => {
    const m = measured.filter((k) => k.section === sec);
    return m.length ? Math.round(m.reduce((a, k) => a + k.mastery, 0) / m.length) : null;
  };
  const hours = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {hello}
          <p className="text-sm text-muted-foreground">{resume.length ? "Pick up where you left off." : "Answer a few questions to get going."}</p>
        </div>
        <Button className="max-w-full whitespace-normal text-left" render={<Link href={primary.href} />}>{resume[0] ? `${primary.action}: ${resume[0].title}` : primary.action}</Button>
      </div>

      {diagnosticPending(profile) && <DiagnosticSuggestion />}

      <section className="rounded-xl border p-5">
        <h2 className="font-semibold">Today&apos;s plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">A study plan based on your schedule and skills.</p>
        <ul className="mt-3 flex flex-col gap-2">{d.blocks.map((block,i) => {
          const skill = 'skillId' in block ? SKILL_BY_ID[block.skillId] : null;
          const href = block.kind==='learn' ? `/skills/${block.skillId}` : block.kind==='desmos' ? `/desmos/${block.lessonSlug}` : block.kind==='review' ? `/practice?mode=review&block=${i}` : `/practice?skill=${block.skillId}&block=${i}`;
          const label = block.kind==='learn' ? 'Learn' : block.kind==='desmos' ? 'Desmos' : block.kind==='review' ? 'Review mistakes' : 'Practice';
          return <li key={i} className="flex items-center justify-between gap-3 text-sm"><Link prefetch={false} className="underline" href={href}>{label}{skill ? ` · ${skill.name}` : ''}</Link><span className="shrink-0 text-muted-foreground">{block.done ? 'Done' : `${block.minutes} min`}</span></li>;
        })}</ul>
        <div className="mt-4 flex flex-wrap gap-4 text-sm"><Link className="underline" href="/question-bank">Choose your own questions</Link><Link className="underline" href="/start">Start from scratch</Link></div>
        {community && <p className="mt-3 text-xs text-muted-foreground">{community.users.toLocaleString()} all-time users · {community.active.toLocaleString()} active in the last 30 days · {community.answered.toLocaleString()} questions answered · {community.tests.toLocaleString()} tests completed.</p>}
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        <Stat label="Goal" value={profile.targetScore ?? "Set goal"} href={profile.targetScore ? undefined : "/settings#goal"} />
        <Stat label="Estimated score" value={hasEvidence ? d.estimate.total : "Not measured yet"} />
        <Stat label="Predicted" value={predicted ?? (hasEvidence ? "Add test date" : "Start practicing")} sub={predicted != null && "on test day"} href={predicted == null ? (hasEvidence ? "/settings#goal" : "/practice") : undefined} />
        <Stat label="Best time to take it" value={best ? month(best.date) : hasEvidence ? "Set goal" : "Start practicing"}
          sub={best?.capped ? `add study time to reach ${profile.targetScore} by then` : tooSoon ? "after your test date" : undefined} warn={tooSoon || best?.capped}
          href={!hasEvidence ? "/practice" : !best || best.capped ? "/settings#goal" : undefined} />
        <Stat label="Next SAT" value={upcoming ? formatDate(testDay!, "UTC") : "Add date"}
          sub={upcoming ? (d.daysLeft === 0 ? "today" : `in ${d.daysLeft} day${d.daysLeft === 1 ? "" : "s"}`) : testDay ? "your last date has passed" : undefined}
          href={upcoming ? undefined : "/settings#goal"} className="col-span-2 sm:col-span-1" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title="Where you left off">
          {resume.length ? resume.map((r) => <Resume key={r.href} {...r} />) : (
            <p className="text-sm text-muted-foreground">Nothing yet. <Link className="underline" href="/start">Start from scratch</Link> or try <Link className="underline" href="/practice">recommended practice</Link>.</p>
          )}
        </Card>

        <Card title="Your numbers" className="order-3 lg:col-span-2">
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              ["Questions", home.totals.answered.toLocaleString("en-US"), `${d.week.answered} this week`],
              ["Accuracy", home.totals.accuracy == null ? "—" : `${home.totals.accuracy}%`, d.week.accuracy == null ? "none this week" : `${d.week.accuracy}% this week`],
              ["Time", hours(home.totals.minutes), `${hours(d.week.minutes)} this week`],
            ].map(([k, v, s]) => (
              <div key={k} className="flex flex-col gap-0.5 rounded-lg bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-lg font-semibold tabular-nums">{v}</dd><dd className="text-xs text-muted-foreground">{s}</dd>
              </div>
            ))}
          </dl>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {(["math", "rw"] as const).map((sec) => {
              const m = sectionMastery(sec);
              return (
                <div key={sec} className="flex flex-col gap-1">
                  <span className="flex justify-between"><span>{sec === "math" ? "Math" : "Reading and Writing"}</span><span className="tabular-nums text-muted-foreground">{m == null ? "—" : `≈ ${sec === "math" ? d.estimate.math : d.estimate.rw}`}</span></span>
                  <MasteryBar pct={m ?? 0} measured={m != null} />
                  <span className="text-xs text-muted-foreground">{m == null ? "not measured yet" : `${m}% skill mastery`}</span>
                </div>
              );
            })}
          </div>
          <Link className="self-start text-sm underline" href="/progress">All your progress</Link>
        </Card>

        <Card title="Skills to work on" className="order-2">
          {weakest.length ? weakest.map((k) => (
            <Link key={k.id} href={`/practice?skill=${k.id}`} className="flex flex-col gap-1 rounded-md p-1 hover:bg-muted">
              <span className="flex justify-between gap-2 text-sm"><span className="truncate">{k.name}</span><span className="tabular-nums text-muted-foreground">{k.mastery}%</span></span>
              <MasteryBar pct={k.mastery} measured />
            </Link>
          )) : <p className="text-sm text-muted-foreground">Answer some questions and your weakest skills show up here.</p>}
        </Card>
      </div>
    </div>
  );
}
