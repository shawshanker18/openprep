import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MasteryBar } from "@/components/mastery-bar";
import { PlanBlocks } from "@/components/plan-blocks";
import { DiagnosticGate } from "@/components/diagnostic-gate";
import { diagnosticPending, getAuthUser, requireUser } from "@/server/auth";
import { dashboardLayout, getDashboard, type DashboardCardId } from "@/server/daily";
import { levelOf, points } from "@/engine/course";
import { getSkillSummary } from "@/server/analytics";
import { SatCountdown } from "@/components/sat-countdown";
import { readyBy } from "@/engine/plan";
import { POINTS_PER_STUDY_HOUR } from "@/engine/constants";

export const metadata = { title: "Home" };

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-3 rounded-xl border p-5 ${className ?? ""}`}>
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
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
  const sectionMastery = (section: "math" | "rw") => {
    const measured = summary.skills.filter((k) => k.section === section && k.status !== "unknown");
    return measured.length ? `${Math.round(measured.reduce((a, k) => a + k.mastery, 0) / measured.length)}%` : "not measured yet";
  };
  const ready = profile.targetScore ? readyBy({ estimate: d.estimate.total, target: profile.targetScore,
    minutesPerDay: profile.minutesPerDay, daysPerWeek: profile.daysPerWeek, now: new Date() }) : null;
  const month = (dt: Date) => dt.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: profile.timezone });
  const testDay = profile.testDate ? new Date(`${profile.testDate}T12:00:00Z`) : null;
  const tooSoon = !!(ready && testDay && testDay < ready.date);

  const cards: Record<DashboardCardId, React.ReactNode> = {
    score: (
      <Card key="score" title="Your score" className="lg:col-span-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-3xl font-semibold tabular-nums">{d.estimate.lo} to {d.estimate.hi}</p>
            <p className="text-sm text-muted-foreground">Current score (estimate)</p>
          </div>
          <div>
            <p className="text-3xl font-semibold tabular-nums">{profile.targetScore ?? "Not set"}</p>
            <p className="text-sm text-muted-foreground">Target score{d.daysLeft != null && d.daysLeft >= 0 ? ` · ${d.daysLeft} days to go` : ""}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="self-start" render={<Link href="/settings#goal" />}>{profile.targetScore ? "Change goal" : "Set goal"}</Button>
        <p className="text-sm text-muted-foreground">Reading &amp; Writing ≈ {d.estimate.rw} · Math ≈ {d.estimate.math} · <Link className="underline" href="/about">how estimates work</Link></p>
        <p className="text-sm text-muted-foreground tabular-nums">Math: {sectionMastery("math")} skill mastery · Reading &amp; Writing: {sectionMastery("rw")}</p>
      </Card>
    ),
    countdown: (
      <Card key="countdown" title="SAT countdown" className="lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            {testDay
              ? <p className="text-lg">{testDay.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</p>
              : <p className="text-sm">No test date yet. <Link className="underline" href="/settings">Add one</Link> so we can count down with you.</p>}
            <p className="text-sm text-muted-foreground">
              {ready
                ? <>Predicted ready for {profile.targetScore}: <b className="text-foreground">{month(ready.date)}</b>{tooSoon && ", which is after your test date"}</>
                : profile.targetScore ? "At your current study time, your target is more than two years away. Adding a little study time in Settings brings it much closer." : "Set a target score in Settings."}
            </p>
          </div>
          {testDay && <SatCountdown testDate={profile.testDate!} timeZone={profile.timezone} />}
        </div>
        {tooSoon && <p className="text-sm">Book an SAT in <b>{month(ready!.date)}</b> or later, or add study time, to give yourself a realistic shot at {profile.targetScore}.</p>}
        <p className="text-xs text-muted-foreground">How we guess this: we compare the points you still need with how much you study each week (students gain roughly {POINTS_PER_STUDY_HOUR} points per hour of focused practice), then add two weeks for a final practice test. It&apos;s a guide for planning, not a promise.</p>
      </Card>
    ),
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
      <Card key="course" title="SAT course">
        {(["math", "rw"] as const).map((sec) => {
          const p = coursePoints(sec);
          const pct = p.max ? Math.round((100 * p.earned) / p.max) : 0;
          return (
            <Link key={sec} href={`/course?section=${sec}`} className="flex flex-col gap-1 rounded-md p-1 hover:bg-muted">
              <span className="flex justify-between text-sm"><span>{sec === "math" ? "Math" : "Reading and Writing"}</span><span className="tabular-nums text-muted-foreground">{pct}% mastered</span></span>
              <span className="h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-primary" style={{ width: `${pct}%` }} /></span>
            </Link>
          );
        })}
        {nextCourseSkill && <Button size="sm" className="self-start" render={<Link href={`/course/${nextCourseSkill.domain}`} />}>Continue: {nextCourseSkill.name}</Button>}
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
  // Custom layout: cards in the chosen order on the two-column grid (score and countdown stay full width).
  if (layout) return <div className="flex flex-col gap-6">{header}<div className="grid gap-4 lg:grid-cols-2">{layout.filter((c) => c.visible).map((c) => cards[c.id])}</div></div>;

  return (
    <div className="flex flex-col gap-6">
    {header}
    <div className="grid gap-4 lg:grid-cols-2">
      {cards.countdown}
      {cards.today}
      <div className="flex flex-col gap-4">
        {cards.score}
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
