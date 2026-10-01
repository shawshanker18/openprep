import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { MasteryBar } from "@/components/mastery-bar";
import { DOMAINS, SKILL_BY_ID } from "@/content/taxonomy";
import { certaintyLabel } from "@/engine/mastery";
import { MISTAKE_LABEL, type MistakeType } from "@/engine/mistakes";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { getSkillDetail, getSkillSummary } from "@/server/analytics";
import { getLesson } from "@/server/lessons";
import { markLessonDone } from "./actions";

const TABS = ["learn", "practice", "performance", "mistakes"] as const;
const SELF = ["Don't know", "A little", "Know it", "Very confident"];
const DIFF = ["", "Easy", "Medium", "Hard"];
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

export default async function SkillPage({ params, searchParams }: PageProps<"/skills/[skillId]">) {
  const { skillId } = await params;
  const skill = SKILL_BY_ID[skillId];
  if (!skill) notFound();
  const sp = await searchParams;
  const tab = TABS.includes(sp.tab as never) ? (sp.tab as (typeof TABS)[number]) : "learn";
  const { userId } = await requireUser();
  const [{ skills }, detail, lesson] = await Promise.all([getSkillSummary(userId), getSkillDetail(userId, skillId), getLesson(skillId)]);
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
        </div>
      </div>

      <nav className="flex gap-1 border-b text-sm">
        {TABS.map((t) => (
          <Link key={t} href={`/skills/${skillId}?tab=${t}`} aria-current={t === tab ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2 capitalize", t === tab ? "border-primary font-medium" : "border-transparent text-muted-foreground")}>{t}</Link>
        ))}
      </nav>

      {tab === "learn" && (lesson ? (
        <div className="flex flex-col gap-2">
          {lesson.minutes && <p className="text-sm text-muted-foreground">About {lesson.minutes} minutes</p>}
          {lesson.sections.map((sec, i) => (
            <details key={sec.heading} open={i === 0} className="rounded-lg border px-4 py-3">
              <summary className="cursor-pointer font-medium">{sec.heading}</summary>
              <Markdown className="mt-3 text-[15px]">{sec.md}</Markdown>
            </details>
          ))}
          <div className="mt-2 flex gap-2">
            {detail.lessonDone ? <span className="text-sm text-muted-foreground">✓ Lesson complete</span> : (
              <form action={markLessonDone.bind(null, skillId)}><Button type="submit" variant="outline">Mark lesson complete</Button></form>
            )}
            <Button render={<Link href={`/practice?skill=${skillId}`} />}>Practise this skill</Button>
          </div>
        </div>
      ) : <p className="text-muted-foreground">The lesson for this skill is coming soon.</p>)}

      {tab === "practice" && (
        <div className="flex flex-col gap-3">
          <Button size="lg" className="self-start" render={<Link href={`/practice?skill=${skillId}`} />}>Practise (adaptive)</Button>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((d) => (
              <Button key={d} variant="outline" render={<Link href={`/practice?skill=${skillId}&difficulty=${d}`} />}>{DIFF[d]} only</Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Mini tests arrive with the test runner.</p>
        </div>
      )}

      {tab === "performance" && (
        <div className="flex flex-col gap-6">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["You said", s.selfRating != null ? SELF[s.selfRating] : "—"],
              ["Estimate confidence", measured ? certaintyLabel(s.n) : "—"],
              ["Accuracy", s.accuracy != null ? `${s.accuracy}%` : "—"],
              ["Answered", `${s.n}`],
              ["Average time", s.avgMs != null ? fmt(s.avgMs) : "—"],
              ["Pace", s.pace ?? "—"],
              ["Trend", detail.trend ?? "—"],
              ["Hardest handled", detail.highestHandled ? DIFF[detail.highestHandled] : "—"],
            ].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium first-letter:uppercase">{v}</dd></div>
            ))}
          </dl>
          {s.calibration === "overestimated" && <p className="text-sm">You rated this higher than your results so far — worth a closer look.</p>}
          {s.calibration === "underestimated" && <p className="text-sm">You&apos;re doing better here than you expected.</p>}
          <Sparkline points={detail.masteryHistory} />
        </div>
      )}

      {tab === "mistakes" && (
        <div className="flex flex-col gap-6">
          {detail.missed.length === 0 ? <p className="text-muted-foreground">No mistakes in this skill yet.</p> : (<>
            <div className="grid gap-6 sm:grid-cols-2">
              <div><h3 className="mb-2 text-sm font-medium">By topic</h3>
                <ul className="text-sm">{detail.mistakesByTag.map((t) => <li key={t.tag} className="flex justify-between"><span>{t.tag.replace(/-/g, " ")}</span><span>{t.n}</span></li>)}</ul></div>
              <div><h3 className="mb-2 text-sm font-medium">By type</h3>
                <ul className="text-sm">{detail.mistakesByType.map((t) => <li key={t.type} className="flex justify-between"><span>{MISTAKE_LABEL[t.type as MistakeType] ?? t.type}</span><span>{t.n}</span></li>)}</ul></div>
            </div>
            <ul className="flex flex-col gap-2">
              {detail.missed.map((m) => (
                <li key={m.id} className="rounded-md border p-3 text-sm">
                  <Markdown className="line-clamp-2">{m.stem}</Markdown>
                  <span className="text-xs text-muted-foreground">
                    Missed {m.at.toLocaleDateString()} · {m.dueAt ? `review due ${m.dueAt.toLocaleDateString()}` : "cleared from review"}
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
