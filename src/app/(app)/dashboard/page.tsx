import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MasteryBar } from "@/components/mastery-bar";
import { PlanBlocks } from "@/components/plan-blocks";
import { DiagnosticGate } from "@/components/diagnostic-gate";
import { diagnosticPending, getAuthUser, requireUser } from "@/server/auth";
import { dashboardLayout, getDashboard, type DashboardCardId } from "@/server/daily";
import { levelOf, points } from "@/engine/course";
import { getSkillSummary } from "@/server/analytics";
import { predictedScore, readyBy } from "@/engine/plan";
import { formatDate } from "@/lib/dates";

export const metadata = { title: "Home" };

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-3 rounded-xl border p-5 ${className ?? ""}`}>
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

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

function greeting(timeZone: string) {
  const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hourCycle: "h23", timeZone }));
  return h < 5 ? "Good late night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const [{ userId, profile }, user] = await Promise.all([requireUser(), getAuthUser()]);
  const first = user?.name?.split(" ")[0];
  const hello = <h1 className="text-2xl font-semibold">{greeting(profile.timezone)}{first ? `, ${first}` : ""}</h1>;
  if (diagnosticPending(profile)) return <div className="flex flex-col gap-6">{hello}<DiagnosticGate /></div>;
  const [d, summary] = await Promise.all([getDashboard(userId, profile), getSkillSummary(userId)]);
  const levels = Object.fromEntries(summary.skills.map((k) => [k.id, levelOf(k.n, k.status)]));
  const coursePoints = (sec: "math" | "rw") => points(summary.skills.filter((k) => k.section === sec).map((k) => levels[k.id]!));
  const nextCourseSkill = summary.skills.filter((k) => k.section === "math").concat(summary.skills.filter((k) => k.section === "rw"))
    .find((k) => !["proficient", "mastered"].includes(levels[k.id]!));
  const planLeft = d.blocks.filter((b) => !b.done).length;
  const ready = profile.targetScore ? readyBy({ estimate: d.estimate.total, target: profile.targetScore,
    minutesPerDay: profile.minutesPerDay, daysPerWeek: profile.daysPerWeek, now: new Date() }) : null;
  const month = (dt: Date) => dt.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: profile.timezone });
  const testDay = profile.testDate ? new Date(`${profile.testDate}T12:00:00Z`) : null;
  const tooSoon = !!(ready && testDay && testDay < ready.date);
  const upcoming = testDay && d.daysLeft != null && d.daysLeft >= 0;
  const predicted = upcoming ? predictedScore({ estimate: d.estimate.total, minutesPerDay: profile.minutesPerDay, daysPerWeek: profile.daysPerWeek, daysLeft: d.daysLeft! }) : null;
  const stats = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Stat label="Goal" value={profile.targetScore ?? "Set goal"} href={profile.targetScore ? undefined : "/settings#goal"} />
      <Stat label="Current score" value={d.estimate.total} />
      <Stat label="Predicted" value={predicted ?? "Add test date"} sub={predicted != null && "on test day"} href={predicted == null ? "/settings#goal" : undefined} />
      <Stat label="Best time to take it" value={ready ? month(ready.date) : profile.targetScore ? "2+ years" : "Set goal"}
        sub={tooSoon ? "after your test date" : !ready && profile.targetScore ? "add study time" : undefined} warn={tooSoon}
        href={!profile.targetScore || !ready ? "/settings#goal" : undefined} />
      <Stat label="Next SAT" value={upcoming ? formatDate(testDay!, "UTC") : "Add date"}
        sub={upcoming ? (d.daysLeft === 0 ? "today" : `in ${d.daysLeft} day${d.daysLeft === 1 ? "" : "s"}`) : testDay ? "your last date has passed" : undefined}
        href={upcoming ? undefined : "/settings#goal"} className="col-span-2 sm:col-span-1" />
    </div>
  );

  const cards: Record<DashboardCardId, React.ReactNode> = {
    today: (
      <Card key="today" title={`Today · ${profile.minutesPerDay} minutes`}>
        <PlanBlocks blocks={d.blocks} />
        <Button variant="outline" className="self-start" render={<Link href="/practice" />}>Smart practice</Button>
      </Card>
    ),
    focus: (
      <Card key="focus" title="Focus this week">
        {d.focusMastery.length ? d.focusMastery.map((f) => (
          <Link key={f.id} href={`/skills/${f.id}`} className="flex flex-col gap-1 rounded-md p-1 hover:bg-muted">
            <div className="flex justify-between text-sm"><span>{f.name}</span><span className="tabular-nums text-muted-foreground">{f.mastery}%</span></div>
            <MasteryBar pct={f.mastery} measured />
          </Link>
        )) : <p className="text-sm text-muted-foreground">No focus skills yet.</p>}
      </Card>
    ),
    "mock-due": d.mockDue && (
      <Card key="mock-due" title="Full mock due">
        <p className="text-sm">A full practice test checks your real pace and stamina.</p>
        <Button className="self-start" render={<Link href="/tests" />}>Go to tests</Button>
      </Card>
    ),
    pace: d.stretch && (
      <Card key="pace" title="Pace check">
        <p className="text-sm">At your current study time, this target is a stretch. Adding some study time or moving your test date would make it more realistic.</p>
      </Card>
    ),
    mistakes: (
      <Card key="mistakes" title="Mistakes to review">
        <p className="text-sm">{d.dueReviews ? `${d.dueReviews} due now` : "Nothing due right now. Nice work."}</p>
        {d.dueReviews > 0 && <Button className="self-start" render={<Link href="/practice?mode=review" />}>Review now</Button>}
      </Card>
    ),
    course: (
      <Card key="course" title="Skill mastery">
        {(["math", "rw"] as const).map((sec) => {
          const p = coursePoints(sec);
          const pct = p.max ? Math.round((100 * p.earned) / p.max) : 0;
          return (
            <Link key={sec} href="/skills" className="flex flex-col gap-1 rounded-md p-1 hover:bg-muted">
              <span className="flex justify-between text-sm"><span>{sec === "math" ? "Math" : "Reading and Writing"}</span><span className="tabular-nums text-muted-foreground">{pct}% mastered</span></span>
              <span className="h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-primary" style={{ width: `${pct}%` }} /></span>
            </Link>
          );
        })}
        {nextCourseSkill && <Button size="sm" className="self-start" render={<Link href={`/start/${nextCourseSkill.id}`} />}>Learn next: {nextCourseSkill.name}</Button>}
      </Card>
    ),
    official: (
      <Card key="official" title="Took the SAT already?">
        <p className="text-sm">Add your official section scores to track your superscore and see real results next to your estimates.</p>
        <Button variant="outline" size="sm" className="self-start" render={<Link href="/settings#scores" />}>Add my scores</Button>
      </Card>
    ),
    week: (
      <Card key="week" title="Last 7 days">
        <p className="text-sm tabular-nums">
          {d.week.answered} questions{d.week.accuracy != null && ` · ${d.week.accuracy}% correct`} · {d.week.minutes} min
        </p>
      </Card>
    ),
  };

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {hello}
        <p className="text-sm text-muted-foreground">
          {planLeft ? `${planLeft} block${planLeft === 1 ? "" : "s"} left in today's plan.` : "Today's plan is done. Any extra practice still counts."}
        </p>
      </div>
      <Button render={<Link href={planLeft ? "/plan" : "/practice"} />}>{planLeft ? "Continue today's plan" : "Smart practice"}</Button>
    </div>
  );

  const layout = dashboardLayout(profile);
  // Custom layout: cards in the chosen order on the two-column grid, under the numbers.
  if (layout) return <div className="flex flex-col gap-6">{header}{stats}<div className="grid gap-4 lg:grid-cols-2">{layout.filter((c) => c.visible).map((c) => cards[c.id])}</div></div>;

  return (
    <div className="flex flex-col gap-6">
    {header}
    {stats}
    <div className="grid gap-4 lg:grid-cols-2">
      {cards.today}
      <div className="flex flex-col gap-4">
        {cards.course}
        {cards.focus}
        {cards["mock-due"]}
        {cards.pace}
        {cards.mistakes}
        {cards.week}
        {cards.official}
      </div>
    </div>
    </div>
  );
}
