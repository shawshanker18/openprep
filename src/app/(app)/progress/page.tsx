import Link from "next/link";
import { DOMAINS, type DomainId } from "@/content/taxonomy";
import { formatDate } from "@/lib/dates";
import { MasteryBar } from "@/components/mastery-bar";
import { requireUser } from "@/server/auth";
import { getProgress, getSkillSummary } from "@/server/analytics";

export const metadata = { title: "Progress" };

type Point = { t: number; total: number; half: number; source: string };

/** Estimate over time: model line with ±range band, other sources as markers, target as a dashed line. */
function ScoreChart({ points, target, timeZone }: { points: Point[]; target: number | null; timeZone: string }) {
  if (points.length < 2) return <p className="text-sm text-muted-foreground">Your score history appears here after a couple of days of practice.</p>;
  const W = 640, H = 200, P = 28;
  const t0 = points[0]!.t, t1 = points.at(-1)!.t || t0 + 1;
  const lo = Math.min(...points.map((p) => p.total - p.half)) - 20;
  const hi = Math.max(...points.map((p) => p.total + p.half), target ?? 0) + 20;
  const x = (t: number) => P + ((t - t0) / Math.max(1, t1 - t0)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
  const model = points.filter((p) => p.source === "model" || p.source === "diagnostic");
  const band = [...model.map((p) => `${x(p.t)},${y(p.total + p.half)}`), ...[...model].reverse().map((p) => `${x(p.t)},${y(p.total - p.half)}`)].join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Estimated score over time">
      {target && <><line x1={P} x2={W - P} y1={y(target)} y2={y(target)} className="stroke-muted-foreground" strokeDasharray="4 4" />
        <text x={W - P} y={y(target) - 4} textAnchor="end" className="fill-muted-foreground text-[10px]">target {target}</text></>}
      {model.length > 1 && <polygon points={band} className="fill-primary/10" />}
      {model.length > 1 && <polyline points={model.map((p) => `${x(p.t)},${y(p.total)}`).join(" ")} fill="none" className="stroke-primary" strokeWidth="2" />}
      {points.map((p, i) => p.source === "mock" || p.source === "official"
        ? <rect key={i} x={x(p.t) - 4} y={y(p.total) - 4} width="8" height="8" transform={`rotate(45 ${x(p.t)} ${y(p.total)})`} className={p.source === "official" ? "fill-foreground" : "fill-primary"} />
        : <circle key={i} cx={x(p.t)} cy={y(p.total)} r="3" className="fill-primary" />)}
      {/* The score itself, first and latest, so the line can be read without hovering. */}
      {[points[0]!, points.at(-1)!].map((p, i) => (
        <text key={i} x={x(p.t)} y={y(p.total) - 8} textAnchor={i ? "end" : "start"} className="fill-foreground text-[11px] font-medium tabular-nums">{p.total}</text>
      ))}
      <text x={P} y={H - 8} className="fill-muted-foreground text-[10px]">{formatDate(t0, timeZone)}</text>
      <text x={W - P} y={H - 8} textAnchor="end" className="fill-muted-foreground text-[10px]">{formatDate(t1, timeZone)}</text>
    </svg>
  );
}

function Bars({ rows }: { rows: { label: string; value: number; suffix?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(8rem,max-content)_1fr_3rem] items-center gap-2">
          <span>{r.label}</span>
          <span className="h-2 rounded-full bg-primary" style={{ width: `${(100 * r.value) / max}%` }} />
          <span className="text-right tabular-nums text-muted-foreground">{r.value}{r.suffix}</span>
        </li>
      ))}
    </ul>
  );
}

const CONF = ["", "Guessed", "Unsure", "Sure"];

export default async function ProgressPage() {
  const { userId, profile } = await requireUser();
  const [p, { skills }] = await Promise.all([getProgress(userId, profile.timezone), getSkillSummary(userId)]);
  const points: Point[] = [
    ...p.snapshots.map((s) => ({ t: s.takenAt.getTime(), total: s.rw + s.math, half: s.halfWidth, source: s.source })),
    ...p.official.map((o) => ({ t: new Date(o.takenOn).getTime(), total: o.math + o.rw, half: 0, source: "official" })),
  ].sort((a, b) => a.t - b.t);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold">Progress</h1>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Estimated score</h2>
        <ScoreChart points={points} target={profile.targetScore} timeZone={profile.timezone} />
        <p className="text-xs text-muted-foreground">The line is your estimated score and the shaded band is how sure we are. Circles are past estimates, blue diamonds are practice tests, and black diamonds are official SAT scores.</p>
      </section>

      {p.official.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Official scores</h2>
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
            <div key={d} className="grid grid-cols-[minmax(8rem,14rem)_1fr_4rem] items-center gap-3 text-sm">
              <span>{DOMAINS[d].name}</span><MasteryBar pct={avg} measured={ks.length > 0} />
              <span className="text-right tabular-nums text-muted-foreground">{ks.length ? `${avg}%` : "Not yet"}</span>
            </div>
          );
        })}
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="flex flex-col gap-3"><h2 className="font-medium">Review your work</h2><Link className="underline" href="/mistakes">Recent mistakes</Link><Link className="underline" href="/skills">Skills</Link><Link className="underline" href="/tests#history">Test history</Link><Link className="underline" href="/practice/sessions">Practice history</Link><Link className="underline" href="/bookmarks">Saved questions</Link></section>
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">How sure vs. how right · 30 days</h2>
          {p.calibration.length ? <Bars rows={p.calibration.sort((a, b) => a.confidence - b.confidence).map((c) => ({ label: `${CONF[c.confidence]} (${c.n})`, value: c.accuracy, suffix: "%" }))} />
            : <p className="text-sm text-muted-foreground">Answer some practice questions to see this.</p>}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Activity · 30 days</h2>
        {p.daily.length ? <Bars rows={p.daily.map((d) => ({ label: new Date(`${d.day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }), value: d.n, suffix: "" }))} />
          : <p className="text-sm text-muted-foreground">No activity yet.</p>}
      </section>
    </div>
  );
}
