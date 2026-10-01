import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MasteryBar } from "@/components/mastery-bar";
import { PlanBlocks } from "@/components/plan-blocks";
import { DiagnosticGate } from "@/components/diagnostic-gate";
import { diagnosticPending, requireUser } from "@/server/auth";
import { getDashboard } from "@/server/daily";
import { SatCountdown } from "@/components/sat-countdown";
import { readyBy } from "@/engine/plan";
import { POINTS_PER_STUDY_HOUR } from "@/engine/constants";

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-3 rounded-xl border p-5 ${className ?? ""}`}>
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default async function DashboardPage() {
  const { userId, profile } = await requireUser();
  if (diagnosticPending(profile)) return <DiagnosticGate />;
  const d = await getDashboard(userId, profile);
  const ready = profile.targetScore ? readyBy({ estimate: d.estimate.total, target: profile.targetScore,
    minutesPerDay: profile.minutesPerDay, daysPerWeek: profile.daysPerWeek, now: new Date() }) : null;
  const month = (dt: Date) => dt.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: profile.timezone });
  const testDay = profile.testDate ? new Date(`${profile.testDate}T12:00:00Z`) : null;
  const tooSoon = !!(ready && testDay && testDay < ready.date);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Your score" className="md:col-span-2">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="text-3xl font-semibold tabular-nums">Estimated {d.estimate.lo}–{d.estimate.hi}</p>
          {profile.targetScore && <p className="text-muted-foreground">Target {profile.targetScore}</p>}
          {d.daysLeft != null && d.daysLeft >= 0 && <p className="text-muted-foreground">{d.daysLeft} days to go</p>}
        </div>
        <p className="text-sm text-muted-foreground">Reading &amp; Writing ≈ {d.estimate.rw} · Math ≈ {d.estimate.math} · <Link className="underline" href="/about">how estimates work</Link></p>
      </Card>

      <Card title="SAT countdown" className="md:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            {testDay
              ? <p className="text-lg">{testDay.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</p>
              : <p className="text-sm">No test date yet — <Link className="underline" href="/settings">add one</Link>.</p>}
            <p className="text-sm text-muted-foreground">
              {ready
                ? <>Predicted ready for {profile.targetScore}: <b className="text-foreground">{month(ready.date)}</b>{tooSoon && " — later than your test date"}</>
                : profile.targetScore ? "At your current study time your target is more than two years away — add study time in Settings." : "Set a target score in Settings."}
            </p>
          </div>
          {testDay && <SatCountdown testDate={profile.testDate!} timeZone={profile.timezone} />}
        </div>
        {tooSoon && <p className="text-sm">Book an SAT in <b>{month(ready!.date)}</b> or later, or add study time, to give yourself a realistic shot at {profile.targetScore}.</p>}
        <p className="text-xs text-muted-foreground">Prediction = points still needed ÷ (your study hours per week × {POINTS_PER_STUDY_HOUR} points per hour), plus 2 weeks for a final mock. A planning estimate, not a promise.</p>
      </Card>

      <Card title={`Today · ${profile.minutesPerDay} minutes`}>
        <PlanBlocks blocks={d.blocks} />
        <Button variant="outline" className="self-start" render={<Link href="/practice" />}>Smart practice</Button>
      </Card>

      <div className="flex flex-col gap-4">
        <Card title="Focus this week">
          {d.focusMastery.length ? d.focusMastery.map((f) => (
            <Link key={f.id} href={`/skills/${f.id}`} className="flex flex-col gap-1 rounded-md p-1 hover:bg-muted">
              <div className="flex justify-between text-sm"><span>{f.name}</span><span className="tabular-nums text-muted-foreground">{f.mastery}%</span></div>
              <MasteryBar pct={f.mastery} measured />
            </Link>
          )) : <p className="text-sm text-muted-foreground">No focus skills yet.</p>}
        </Card>

        {d.mockDue && (
          <Card title="Full mock due">
            <p className="text-sm">A full practice test checks your real pace and stamina.</p>
            <Button className="self-start" render={<Link href="/tests" />}>Go to tests</Button>
          </Card>
        )}
        {d.stretch && (
          <Card title="Pace check">
            <p className="text-sm">At your current time budget this target is a stretch — consider adding study time or moving the date.</p>
          </Card>
        )}

        <Card title="Mistakes to review">
          <p className="text-sm">{d.dueReviews ? `${d.dueReviews} due now` : "None due — nice."}</p>
          {d.dueReviews > 0 && <Button className="self-start" render={<Link href="/practice?mode=review" />}>Review now</Button>}
        </Card>

        <Card title="Last 7 days">
          <p className="text-sm tabular-nums">
            {d.week.answered} questions{d.week.accuracy != null && ` · ${d.week.accuracy}% correct`} · {d.week.minutes} min
          </p>
        </Card>
      </div>
    </div>
  );
}
