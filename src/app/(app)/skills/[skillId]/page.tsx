import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { MasteryBar } from "@/components/mastery-bar";
import { DOMAINS, SKILL_BY_ID } from "@/content/taxonomy";
import { certaintyLabel, certaintyPct } from "@/engine/mastery";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { getSkillDetail, getSkillSummary } from "@/server/analytics";
import { skillStats, tagsBySkill } from "@/server/practice";

// Lessons live in Start from scratch; this page is only the student's standing on the skill.
const TABS = ["performance", "practice", "mistakes"] as const;
const SELF = ["Don't know", "A little", "Know it", "Very confident"];
const DIFF = ["", "Easy", "Medium", "Hard"];
const CONF = ["", "Guessed", "Unsure", "Sure"];
const fmt = (ms: number) => `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <p className="text-sm text-muted-foreground">Answer a few questions to see your mastery over time.</p>;
  const w = 600, h = 120;
  const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - (p / 100) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full" role="img" aria-label={`Mastery over the last ${points.length} answers`}>
      <line x1="0" x2={w} y1={h / 2} y2={h / 2} className="stroke-border" strokeDasharray="4 4" />
      <polyline points={d} fill="none" className="stroke-primary" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export async function generateMetadata({ params }: PageProps<"/skills/[skillId]">) {
  return { title: SKILL_BY_ID[(await params).skillId]?.name ?? "Skill" };
}

export default async function SkillPage({ params, searchParams }: PageProps<"/skills/[skillId]">) {
  const { skillId } = await params;
  const skill = SKILL_BY_ID[skillId];
  if (!skill) notFound();
  const sp = await searchParams;
  if (sp.tab === "learn") redirect(`/start/${skillId}`);
  const tab = TABS.includes(sp.tab as never) ? (sp.tab as (typeof TABS)[number]) : "performance";
  const { userId, profile } = await requireUser();
  const [{ skills }, detail, stats, tags] = await Promise.all([
    getSkillSummary(userId), getSkillDetail(userId, skillId), skillStats(userId, skillId), tagsBySkill(),
  ]);
  const confTotal = stats.confidence.reduce((a, r) => a + r.n, 0);
  const s = skills.find((k) => k.id === skillId)!;
  const measured = s.status !== "unknown";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/skills" className="text-sm text-muted-foreground">← {DOMAINS[skill.domain].name}</Link>
        <h1 className="text-2xl font-semibold">{skill.name}</h1>
        <div className="flex items-center gap-3">
          <div className="w-48"><MasteryBar pct={s.mastery} measured={measured} selfRating={s.selfRating} /></div>
          <span className="text-sm text-muted-foreground tabular-nums">{measured ? `${s.mastery}% mastery` : "Not measured yet"}</span>
          <Link href={`/start/${skillId}`} className="text-sm underline underline-offset-4">{detail.lessonDone ? "Read the lesson again" : "Learn this topic"}</Link>
        </div>
      </div>

      <nav className="flex gap-1 border-b text-sm">
        {TABS.map((t) => (
          <Link key={t} href={`/skills/${skillId}?tab=${t}`} aria-current={t === tab ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2 capitalize", t === tab ? "border-primary font-medium" : "border-transparent text-muted-foreground")}>{t}</Link>
        ))}
      </nav>

      {tab === "practice" && (
        <div className="flex flex-col gap-3">
          <Button size="lg" className="self-start" render={<Link href={`/practice?skill=${skillId}`} />}>Practice this skill</Button>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((d) => (
              <Button key={d} variant="outline" render={<Link href={`/practice?skill=${skillId}&difficulty=${d}`} />}>{DIFF[d]}</Button>
            ))}
            <Button variant="outline" render={<Link href={`/practice?mode=set&skills=${skillId}&difficulty=mixed&timing=on`} />}>SAT-level</Button>
            {tags[skillId]?.includes("desmos") && (
              <Button variant="outline" render={<Link href={`/practice?mode=set&skills=${skillId}&tags=desmos`} />}>Desmos-based</Button>
            )}
            <Button variant="outline" render={<Link href={`/practice?mode=review&skill=${skillId}`} />}>Review mistakes</Button>

          </div>
          <p className="text-sm text-muted-foreground">SAT-level mixes difficulties with a countdown at real test pace.</p>
        </div>
      )}

      {tab === "performance" && (
        <div className="flex flex-col gap-6">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["You said", s.selfRating != null ? SELF[s.selfRating] : "Not yet"],
              ["How sure we are", measured ? `${certaintyPct(s.n)}% (${certaintyLabel(s.n)})` : "Not yet"],
              ["Your confidence", confTotal ? stats.confidence.toSorted((a, b) => a.confidence - b.confidence)
                .map((r) => `${CONF[r.confidence]} ${Math.round((100 * r.n) / confTotal)}%`).join(" · ") : "Not yet"],
              ["Accuracy", s.accuracy != null ? `${s.accuracy}%` : "Not yet"],
              ["Recent accuracy", stats.recent.n ? `${Math.round((100 * stats.recent.correct) / stats.recent.n)}% (last ${stats.recent.n})` : "Not yet"],
              ["Answered", `${s.n}`],
              ["Last practiced", s.lastPracticedAt ? formatDate(s.lastPracticedAt, profile.timezone) : "Not yet"],
              ["Diagnostic", stats.diagnostic.n ? `${stats.diagnostic.c}/${stats.diagnostic.n} correct` : "Not yet"],
              ["Average time", s.avgMs != null ? fmt(s.avgMs) : "Not yet"],
              ["Pace", s.pace ?? "Not yet"],
              ["Trend", detail.trend ?? "Not yet"],
              ["Hardest handled", detail.highestHandled ? DIFF[detail.highestHandled] : "Not yet"],
            ].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium first-letter:uppercase">{v}</dd></div>
            ))}
          </dl>
          {s.calibration === "overestimated" && <p className="text-sm">You rated this higher than your results show so far, so it is worth a closer look.</p>}
          {s.calibration === "underestimated" && <p className="text-sm">You&apos;re doing better here than you expected.</p>}
          <Sparkline points={detail.masteryHistory} />
          <div>
            <h3 className="mb-2 text-sm font-medium">Sub-skills</h3>
            {stats.byTag.length === 0 ? <p className="text-sm text-muted-foreground">Answer a few questions to see how you do on each sub-topic.</p> : (
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground"><tr><th className="py-1 font-normal">Sub-topic</th><th className="font-normal">Attempts</th><th className="font-normal">Accuracy</th></tr></thead>
                <tbody>
                  {stats.byTag.map((t) => (
                    <tr key={t.tag} className="border-t">
                      <td className="py-2 first-letter:uppercase">{t.tag.replace(/-/g, " ")}</td>
                      <td className="tabular-nums">{t.n}</td>
                      <td className="tabular-nums">{Math.round((100 * t.c) / t.n)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "mistakes" && (
        <div className="flex flex-col gap-6">
          {detail.missed.length === 0 ? <p className="text-muted-foreground">No mistakes in this skill yet.</p> : (<>
            <div className="grid gap-6 sm:grid-cols-2">
              <div><h3 className="mb-2 text-sm font-medium">By topic</h3>
                <ul className="text-sm">{detail.mistakesByTag.map((t) => <li key={t.tag} className="flex justify-between"><span>{t.tag.replace(/-/g, " ")}</span><span>{t.n}</span></li>)}</ul></div>

            </div>
            <ul className="flex flex-col gap-2">
              {detail.missed.map((m) => (
                <li key={m.id} className="rounded-md border p-3 text-sm">
                  <Markdown className="line-clamp-2">{m.stem}</Markdown>
                  <span className="text-xs text-muted-foreground">
                    Missed {formatDate(m.at, profile.timezone)} · {m.dueAt ? `review due ${formatDate(m.dueAt, profile.timezone)}` : "cleared from review"}
                  </span>
                </li>
              ))}
            </ul>
            <Button className="self-start" render={<Link href="/practice?mode=review" />}>Review due mistakes</Button>
          </>)}
        </div>
      )}
    </div>
  );
}
