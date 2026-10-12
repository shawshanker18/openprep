import Link from "next/link";
import { DOMAINS, type DomainId } from "@/content/taxonomy";
import { formatDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { MasteryBar } from "@/components/mastery-bar";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { getActivity } from "@/server/activity";
import { requireUser } from "@/server/auth";
import { guarded } from "@/server/guard";
import { getProgress, getSkillSummary } from "@/server/analytics";

export const metadata = { title: "Progress" };

type Point = { t: number; total: number; half: number; source: string };

/** Estimate over time: model line with a ±range band, other sources as markers. Labels are sized in viewBox units. */
function ScoreChart({ points, target, timeZone }: { points: Point[]; target: number | null; timeZone: string }) {
  if (points.length < 2) return <p className="text-sm text-muted-foreground">Your score history appears here after a couple of days of practice.</p>;
  const W = 800, H = 330;
  const PL = 64, PR = 28, PT = 26, PB = 58; // room on the left for the Y-axis title and ticks, below for the X-axis
  const t0 = points[0]!.t, t1 = points.at(-1)!.t || t0 + 1;
  const lo = Math.min(...points.map((p) => p.total - p.half)) - 20;
  const hi = Math.max(...points.map((p) => p.total + p.half), target ?? 0) + 20;
  const x = (t: number) => PL + ((t - t0) / Math.max(1, t1 - t0)) * (W - PL - PR);
  const y = (v: number) => H - PB - ((v - lo) / (hi - lo)) * (H - PB - PT);
  // Whole-score ticks at a readable step (50 or 100), so the axis carries real values rather than only the endpoints.
  const step = hi - lo > 300 ? 100 : 50;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  const model = points.filter((p) => p.source === "model" || p.source === "diagnostic");
  const band = [...model.map((p) => `${x(p.t)},${y(p.total + p.half)}`), ...[...model].reverse().map((p) => `${x(p.t)},${y(p.total - p.half)}`)].join(" ");
  return (
    <div className="-mx-1 overflow-x-auto px-1"><svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px] sm:min-w-0" role="img" aria-label="Estimated SAT score over time, from the first to the latest estimate">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} className="stroke-border" strokeDasharray="3 4" />
          <text x={PL - 6} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground text-[12px] tabular-nums">{v}</text>
        </g>
      ))}
      <text transform={`translate(16 ${(H - PB + PT) / 2}) rotate(-90)`} textAnchor="middle" className="fill-foreground text-[12px]">Estimated SAT score (400–1600)</text>
      {target && <line x1={PL} x2={W - PR} y1={y(target)} y2={y(target)} className="stroke-muted-foreground" strokeDasharray="4 4" />}
      {model.length > 1 && <polygon points={band} className="fill-primary/10" />}
      {model.length > 1 && <polyline points={model.map((p) => `${x(p.t)},${y(p.total)}`).join(" ")} fill="none" className="stroke-primary" strokeWidth="2" />}
      {points.map((p, i) => p.source === "mock" || p.source === "official"
        ? <rect key={i} x={x(p.t) - 4} y={y(p.total) - 4} width="8" height="8" transform={`rotate(45 ${x(p.t)} ${y(p.total)})`} className={p.source === "official" ? "fill-foreground" : "fill-primary"} />
        : <circle key={i} cx={x(p.t)} cy={y(p.total)} r="3" className="fill-primary" />)}
      {/* The score itself, first and latest, so the line can be read without hovering. */}
      {[points[0]!, points.at(-1)!].map((p, i) => {
        // A label goes below its point when the line arrives from above, so the line never runs through the number.
        const arrivesFromAbove = i === 1 && points.length > 1 && p.total < points.at(-2)!.total;
        return <text key={i} x={x(p.t)} y={y(p.total) + (arrivesFromAbove ? 20 : -9)} textAnchor={i ? "end" : "start"} className="fill-foreground text-[12px] font-medium tabular-nums">{p.total}</text>;
      })}
      <text x={PL} y={H - 30} className="fill-muted-foreground text-[12px]">{formatDate(t0, timeZone)}</text>
      <text x={W - PR} y={H - 30} textAnchor="end" className="fill-muted-foreground text-[12px]">{formatDate(t1, timeZone)}</text>
      <text x={(PL + W - PR) / 2} y={H - 8} textAnchor="middle" className="fill-foreground text-[12px]">Date of each estimate or test (your local time)</text>
    </svg></div>
  );
}

export default async function ProgressPage() {
  const { userId, profile } = await requireUser();
  const [p, { skills }, activity] = await guarded(Promise.all([getProgress(userId, profile.timezone), getSkillSummary(userId), getActivity(userId, profile.timezone)]));
  const points: Point[] = [
    ...p.snapshots.map((s) => ({ t: s.takenAt.getTime(), total: s.rw + s.math, half: s.halfWidth, source: s.source })),
    ...p.official.map((o) => ({ t: new Date(o.takenOn).getTime(), total: o.math + o.rw, half: 0, source: "official" })),
  ].sort((a, b) => a.t - b.t);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold">Progress</h1>
      <ActivityHeatmap activity={activity} />

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Estimated score over time</h2>
        <ScoreChart points={points} target={profile.targetScore} timeZone={profile.timezone} />
        <p className="text-xs text-muted-foreground">The line is your estimated score and the shaded band is how sure we are. Circles are past estimates, blue diamonds are practice tests, and black diamonds are official SAT scores. The dashed line is your target{profile.targetScore ? ` (${profile.targetScore})` : ""}.</p>
      </section>

      {(
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Official SAT scores</h2>
          <Button variant="outline" size="sm" className="self-start" render={<Link href="/settings#scores" />}>Add your official SAT result</Button>
          <p className="text-xs text-muted-foreground">Your scores stay private to your account.</p>
          <ul className="text-sm tabular-nums">{p.official.map((o) => <li key={o.id}>{o.takenOn}: {o.math + o.rw} (Math {o.math}, R&amp;W {o.rw})</li>)}</ul>
          {p.superscore && <p className="text-sm">Superscore: <b>{p.superscore.total}</b> (Math {p.superscore.math} + R&amp;W {p.superscore.rw})</p>}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Mastery by domain</h2>
        {(Object.keys(DOMAINS) as DomainId[]).sort((a,b)=>Number(DOMAINS[a].section!=="math")-Number(DOMAINS[b].section!=="math")).map((d) => {
          const ks = skills.filter((s) => s.domain === d && s.status !== "unknown");
          const avg = ks.length ? Math.round(ks.reduce((a, s) => a + s.mastery, 0) / ks.length) : 0;
          return (
            <div key={d} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem] items-center gap-3 text-sm">
              <span>{DOMAINS[d].name}</span><MasteryBar pct={avg} measured={ks.length > 0} />
              <span className="text-right tabular-nums text-muted-foreground">{ks.length ? `${avg}%` : "Not yet"}</span>
            </div>
          );
        })}
      </section>

      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3"><h2 className="font-medium">Review your work</h2>
          <div className="flex flex-wrap gap-2">
            {([["/mistakes", "Recent mistakes"], ["/skills", "Skills"], ["/tests#history", "Test history"], ["/practice/sessions", "Practice history"], ["/bookmarks", "Saved questions"]] as const).map(([href, label]) => (
              <Button key={href} variant="outline" render={<Link href={href} />}>{label}</Button>
            ))}
          </div></section>

      </div>
    </div>
  );
}
