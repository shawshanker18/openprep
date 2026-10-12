import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DOMAINS, SKILLS, SKILL_BY_ID, type DomainId } from "@/content/taxonomy";
import { TARGET_SECONDS } from "@/engine/constants";
import {
  accuracyChange, accuracyPct, byDifficulty, groupSummaries, hasEnoughData, MIN_SAMPLE, recommend, shareOfMistakes, summarize,
  type Bucket, type Summary, type SkillRow,
} from "@/engine/analysis";
import { requireUser } from "@/server/auth";
import { guarded } from "@/server/guard";
import { getAnalysisBuckets, getDailyAccuracy, parseRange, rangeSince, RANGES, type Range } from "@/server/analysis";
import { cn } from "@/lib/utils";
import { DifficultyRing, type Segment } from "./difficulty-rings";
import { MistakesList } from "./mistakes-list";

export const metadata = { title: "Analysis" };

const RANGE_LABEL: Record<Range, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days", all: "All time" };
const SECTION_LABEL = { rw: "Reading and Writing", math: "Math" } as const;

const pct = (v: number | null) => (v === null ? "Not enough data" : `${v}%`);
const secs = (v: number | null) => (v === null ? "Not enough timing data" : `${v}s`);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
/** Day strings come from the database as YYYY-MM-DD in the student's timezone, so they are formatted without a zone. */
const dayLabel = (day: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
const rangeLink = (active: boolean) => cn("text-sm underline-offset-4 hover:underline", active ? "font-medium underline" : "text-muted-foreground");
/** Targeted practice for one skill, using the same query shape as the question bank. */
const practiceHref = (skillId: string) => `/practice?mode=set&from=/analysis&skills=${skillId}&difficulties=1,2,3&count=10&timing=off`;

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  );
}

/** Correct versus incorrect. The legend carries the exact numbers, so the chart is not read by colour alone. */
function Donut({ correct, incorrect }: { correct: number; incorrect: number }) {
  const total = correct + incorrect;
  const r = 40, C = 2 * Math.PI * r;
  return (
    <figure className="flex items-center gap-3">
      <svg viewBox="0 0 100 100" className="size-24 shrink-0 -rotate-90" role="img" aria-label={`${correct} correct and ${incorrect} incorrect answers`}>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="14" className="stroke-muted" />
        {total > 0 && <circle cx="50" cy="50" r={r} fill="none" strokeWidth="14" className="stroke-primary" strokeDasharray={`${(correct / total) * C} ${C}`} />}
      </svg>
      <figcaption className="flex flex-col gap-2 text-sm">
        <span><b className="tabular-nums">{correct}</b> correct</span>
        <span><b className="tabular-nums">{incorrect}</b> incorrect</span>
        <span className="text-xs text-muted-foreground">of {total} answered</span>
      </figcaption>
    </figure>
  );
}

/** Accuracy per local day. Labels are sized in viewBox units and the chart is capped in width, so they stay readable on phones. */
function AccuracyChart({ days }: { days: { day: string; answered: number; correct: number }[] }) {
  const pts = days.filter((d) => d.answered > 0).map((d) => ({ ...d, acc: accuracyPct(d.correct, d.answered)! }));
  if (pts.length < 2) return <p className="text-sm text-muted-foreground">Accuracy over time appears once you have answered questions on at least two days in this period.</p>;
  const W = 400, H = 230, PL = 56, PR = 16, PT = 12, PB = 44;
  const x = (i: number) => PL + (i / (pts.length - 1)) * (W - PL - PR);
  const y = (v: number) => H - PB - (v / 100) * (H - PB - PT);
  const first = pts[0]!, last = pts.at(-1)!;
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[520px]" role="img" aria-label={`Accuracy per day from ${dayLabel(first.day)} to ${dayLabel(last.day)}`}>
        {[0, 50, 100].map((t) => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} className="stroke-border" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={PL - 6} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[12px] tabular-nums">{t}%</text>
          </g>
        ))}
        <text transform={`translate(16 ${(H - PB + PT) / 2}) rotate(-90)`} textAnchor="middle" className="fill-foreground text-[12px]">Accuracy (% correct)</text>
        <polyline points={pts.map((p, i) => `${x(i)},${y(p.acc)}`).join(" ")} fill="none" className="stroke-primary" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {pts.map((p, i) => (
          <circle key={p.day} cx={x(i)} cy={y(p.acc)} r="4" className="fill-primary">
            <title>{`${dayLabel(p.day)}: ${p.acc}% correct (${p.correct} of ${p.answered} answers)`}</title>
          </circle>
        ))}
        <text x={PL} y={H - 24} className="fill-muted-foreground text-[12px]">{dayLabel(first.day)}</text>
        <text x={W - PR} y={H - 24} textAnchor="end" className="fill-muted-foreground text-[12px]">{dayLabel(last.day)}</text>
        <text x={(PL + W - PR) / 2} y={H - 6} textAnchor="middle" className="fill-foreground text-[12px]">Date (your local day)</text>
      </svg>
    </figure>
  );
}

export default async function AnalysisPage({ searchParams }: PageProps<"/analysis">) {
  const sp = await searchParams;
  const tab = sp.tab === "mistakes" ? "mistakes" : "overview";
  const range = parseRange(sp.range);
  const since = rangeSince(range);
  const { userId, profile } = await requireUser();
  const [buckets, days] = await guarded(Promise.all([getAnalysisBuckets(userId, since), getDailyAccuracy(userId, profile.timezone, since)]));

  const total = summarize(buckets);
  const rangeNav = (
    <nav aria-label="Date range" className="flex flex-wrap gap-2">
      {(Object.keys(RANGES) as Range[]).map((r) => (
        <Link key={r} href={`/analysis?range=${r}`} className={rangeLink(range === r)} aria-current={range === r ? "page" : undefined}>{RANGE_LABEL[r]}</Link>
      ))}
    </nav>
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Analysis</h1>
        <p className="text-sm text-muted-foreground">How you are doing, where your mistakes cluster, and what to practice next. Every number comes from your recorded answers.</p>
        {rangeNav}
      </header>

      <nav aria-label="Analysis view" className="flex gap-5 border-b text-sm">
        <Link href="/analysis" aria-current={tab === "overview" ? "page" : undefined} className="-mb-px border-b-2 border-transparent pb-2 text-muted-foreground aria-[current=page]:border-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground">Overview</Link>
        <Link href="/analysis?tab=mistakes" aria-current={tab === "mistakes" ? "page" : undefined} className="-mb-px border-b-2 border-transparent pb-2 text-muted-foreground aria-[current=page]:border-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground">Mistakes</Link>
      </nav>

      {tab === "mistakes" ? <MistakesList sp={sp} /> : total.answered === 0 ? (
        <section className="flex flex-col gap-3 rounded-xl border p-5">
          <h2 className="font-medium">No answers in this period yet</h2>
          <p className="text-sm text-muted-foreground">Answer questions in Adaptive Practice or the Question bank and your accuracy, timing and mistakes will appear here.</p>
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/practice" />}>Adaptive Practice</Button>
            <Button variant="outline" render={<Link href="/question-bank" />}>Question bank</Button>
          </div>
        </section>
      ) : (
        <AnalysisBody buckets={buckets} days={days} total={total} />
      )}
    </div>
  );
}

function AnalysisBody({ buckets, days, total }: {
  buckets: Bucket[]; days: { day: string; answered: number; correct: number }[]; total: Summary;
}) {
  const bySkill = groupSummaries(buckets, (b) => b.skillId);
  const byDomain = groupSummaries(buckets, (b) => SKILL_BY_ID[b.skillId]?.domain);
  const rows: SkillRow[] = SKILLS.filter((s) => bySkill.has(s.id)).map((s) => ({
    skillId: s.id, name: s.name, section: s.section, summary: bySkill.get(s.id)!,
  }));
  const recs = recommend(rows, TARGET_SECONDS);

  // Change across the period: first half of the active days against the second half.
  const active = days.filter((d) => d.answered > 0);
  const mid = Math.floor(active.length / 2);
  const periodSummary = (rs: typeof active) => summarize([{ skillId: "", difficulty: 1, answered: rs.reduce((a, d) => a + d.answered, 0), correct: rs.reduce((a, d) => a + d.correct, 0), timedN: 0, timedMs: 0 }]);
  const change = active.length >= 4 ? accuracyChange(periodSummary(active.slice(0, mid)), periodSummary(active.slice(mid))) : null;

  const subjectRings = (["math", "rw"] as const).map((section) => {
    const list = buckets.filter((b) => SKILL_BY_ID[b.skillId]?.section === section);
    const d = byDifficulty(list);
    const levels = [1, 2, 3] as const;
    const name = { 1: "Easy", 2: "Medium", 3: "Hard" } as const;
    const correctOf = (l: 1 | 2 | 3) => list.filter((b) => b.difficulty === l).reduce((n, b) => n + b.correct, 0);
    const timeOf = (l: 1 | 2 | 3) => list.filter((b) => b.difficulty === l).reduce((n, b) => n + b.timedMs, 0);
    const totalAnswered = levels.reduce((n, l) => n + d[l].answered, 0);
    const totalCorrect = levels.reduce((n, l) => n + correctOf(l), 0);
    const totalTimedMs = levels.reduce((n, l) => n + timeOf(l), 0);
    const totalTimed = levels.reduce((n, l) => n + d[l].timedN, 0);
    const overall = summarize(list);
    return {
      key: section,
      label: section === "math" ? "Math" : "English",
      accuracy: levels.map((l): Segment => ({
        label: name[l], value: correctOf(l),
        display: d[l].accuracy === null ? "No data" : `${d[l].accuracy}%`,
        note: plural(d[l].answered, "answer"),
      })) as [Segment, Segment, Segment],
      accuracyCenter: overall.accuracy === null ? "No data" : `${overall.accuracy}%`,
      time: levels.map((l): Segment => ({
        label: name[l], value: timeOf(l),
        display: d[l].avgSeconds === null ? "No timing" : `${d[l].avgSeconds}s`,
        note: d[l].timedN ? `${d[l].timedN} timed` : "No timing",
      })) as [Segment, Segment, Segment],
      timeCenter: totalTimed === 0 ? "No timing" : `${Math.round((totalTimedMs / totalTimed / 1000) * 10) / 10}s`,
      share: levels.map((l): Segment => ({
        label: name[l], value: d[l].answered,
        display: totalAnswered === 0 ? "No data" : `${Math.round((100 * d[l].answered) / totalAnswered)}%`,
        note: plural(d[l].answered, "answer"),
      })) as [Segment, Segment, Segment],
      shareCenter: String(totalAnswered),
      totalCorrect,
    };
  });

  return (
    <>
      <section aria-labelledby="overview" className="flex flex-col gap-4">
        <h2 id="overview" className="font-medium">Overview</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Answered questions" value={String(total.answered)} />
          <Stat label="Overall accuracy" value={pct(total.accuracy)} note={change === null ? "Change: not enough days to compare" : `${change >= 0 ? "+" : ""}${change} points, second half of period vs first`} />
          <Stat label="Average time per question" value={secs(total.avgSeconds)} note={total.timedN ? `From ${plural(total.timedN, "timed answer")}` : "Needs timed answers"} />
          <div className="flex min-w-0 flex-col gap-3 rounded-xl border p-4">
            <span className="text-xs text-muted-foreground">Correct and incorrect</span>
            <Donut correct={total.correct} incorrect={total.incorrect} />
          </div>
        </div>
      </section>

      <section aria-labelledby="difficulty" className="flex flex-col gap-6">
        <h2 id="difficulty" className="font-medium">By SAT difficulty</h2>
        <p className="text-xs text-muted-foreground">Each ring is split into Easy (green), Medium (yellow) and Hard (red). Unanswered attempts are not counted, and a time is only used when it is between 1 second and 10 minutes.</p>
        {subjectRings.map((subj) => (
          <div key={subj.key} className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">{subj.label}</h3>
            <div className="grid auto-rows-fr gap-3 md:grid-cols-3">
              <DifficultyRing title="Accuracy by difficulty"
                segments={subj.accuracy} centerValue={subj.accuracyCenter} centerLabel="accuracy" />
              <DifficultyRing title="Time per question"
                segments={subj.time} centerValue={subj.timeCenter} centerLabel="average" />
              <DifficultyRing title="Answers by difficulty"
                segments={subj.share} centerValue={subj.shareCenter} centerLabel="answers" />
            </div>
          </div>
        ))}
      </section>

      <section aria-labelledby="trend" className="flex flex-col gap-3">
        <h2 id="trend" className="font-medium">Accuracy over time</h2>
        <AccuracyChart days={days} />
      </section>

      <section aria-labelledby="next" className="flex flex-col gap-3">
        <h2 id="next" className="font-medium">What to practice next</h2>
        {recs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clear next step yet. A skill is only ranked after {MIN_SAMPLE} answers, so keep practising and this will fill in.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recs.map((r) => (
              <li key={`${r.kind}-${r.skillId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm">
                <span className="min-w-0"><b className="font-medium">{r.kind === "practice" ? "Practice" : "Speed up"}: {r.name}</b><span className="block text-xs text-muted-foreground">{r.reason}</span></span>
                <Button variant="outline" size="sm" render={<Link href={practiceHref(r.skillId)} prefetch={false} />}>Practice this skill</Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">Recommendations need at least {MIN_SAMPLE} answers in a skill, and are based only on your answers.</p>
      </section>

      <section aria-labelledby="skills" className="flex flex-col gap-5">
        <h2 id="skills" className="font-medium">Topics and skills</h2>
        {(["rw", "math"] as const).map((section) => (
          <div key={section} className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-muted-foreground">{SECTION_LABEL[section]}</h3>
            {(Object.keys(DOMAINS) as DomainId[]).filter((d) => DOMAINS[d].section === section).map((domainId) => {
              const dom = byDomain.get(domainId);
              if (!dom || dom.answered === 0) return null;
              const skillRows = SKILLS.filter((s) => s.domain === domainId && bySkill.has(s.id) && bySkill.get(s.id)!.answered > 0)
                .sort((a, b) => bySkill.get(b.id)!.incorrect - bySkill.get(a.id)!.incorrect);
              return (
                <div key={domainId} className="flex flex-col gap-3 rounded-xl border p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="font-medium">{DOMAINS[domainId].name}</h4>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {pct(dom.accuracy)} correct · {plural(dom.incorrect, "mistake")}{shareOfMistakes(dom, total) !== null ? ` (${shareOfMistakes(dom, total)}% of all)` : ""}
                    </span>
                  </div>
                  <ul className="flex flex-col divide-y">
                    {skillRows.map((s) => {
                      const sm: Summary = bySkill.get(s.id)!;
                      const limited = !hasEnoughData(sm);
                      return (
                        <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2 text-sm">
                          <span className="min-w-0 flex-1">
                            {s.name}
                            <span className="block text-xs text-muted-foreground tabular-nums">
                              {plural(sm.answered, "answer")} · {pct(sm.accuracy)} correct · {sm.incorrect} incorrect · avg {secs(sm.avgSeconds)}
                              {limited && " · Limited data"}
                            </span>
                          </span>
                          <span className="flex gap-3 text-xs">
                            <Link className="underline underline-offset-4" href={`/skills/${s.id}?tab=mistakes`}>Mistakes</Link>
                            <Link className="underline underline-offset-4" href={practiceHref(s.id)} prefetch={false}>Practice</Link>
                            <Link className="underline underline-offset-4" href={`/question-bank?skill=${s.id}`}>Question bank</Link>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
      </section>

      <section aria-labelledby="review" className="flex flex-col gap-3">
        <h2 id="review" className="font-medium">Mistake review</h2>
        <p className="text-sm text-muted-foreground">Every missed question with your answer, the correct answer and the explanation, newest first.</p>
        <Button variant="outline" className="self-start" render={<Link href="/mistakes" />}>Review your mistakes</Button>
      </section>
    </>
  );
}
