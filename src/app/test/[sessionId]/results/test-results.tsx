import Link from "next/link";
import { Fragment } from "react";
import { formatDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { DOMAINS, SKILL_BY_ID, type DomainId } from "@/content/taxonomy";
import { type TestResult } from "@/engine/score";
import type { getTestResult } from "@/server/tests";
import { ReviewItem } from "./review-item";

type Data = NonNullable<Awaited<ReturnType<typeof getTestResult>>>;
const KIND = { full: "Full practice test", section: "Section test", module: "Single module", mini: "Mini test", weakness: "Weakness test", custom: "Custom test" } as Record<string, string>;
const ROUTE = { hard: "You reached the harder second module.", easy: "You were routed to the easier second module." } as Record<string, string>;

/** 75000 → "1:15" */
const mmss = (ms: number) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

function TimingStats({ timing: t }: { timing: Data["timing"] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {t.sections.map((s) => (
          <div key={s.section} className="flex flex-col gap-1 rounded-lg border p-4 text-sm">
            <p className="font-medium">{s.section === "rw" ? "Reading and Writing" : "Math"}</p>
            <p><span className="text-2xl font-semibold tabular-nums">{mmss(s.avgMs)}</span> <span className="text-muted-foreground">per question on average (SAT pace is about {mmss(s.paceMs)})</span></p>
            <p className="text-muted-foreground">{s.questions} questions in {mmss(s.totalMs)}</p>
            {s.avgCorrectMs != null && <p>Right answers took {mmss(s.avgCorrectMs)} on average{s.avgWrongMs != null ? `, wrong ones ${mmss(s.avgWrongMs)}` : ""}.</p>}
            {s.slow > 0 && <p>{s.slow} question{s.slow === 1 ? "" : "s"} took more than one and a half times the SAT pace.</p>}
            {s.rushed > 0 && <p>{s.rushed} wrong answer{s.rushed === 1 ? " was" : "s were"} given in under {mmss(s.paceMs / 3)}. Slowing down there is free points.</p>}
          </div>
        ))}
      </div>
      {t.slowest.length > 0 && (
        <p className="text-sm">
          Longest: {t.slowest.map((x, k) => <span key={x.n}>{k > 0 && ", "}<a className="underline" href={`#q-${x.n}`}>question {x.n}</a> ({mmss(x.timeMs)})</span>)}.
          Total time {mmss(t.totalMs)}.
        </p>
      )}
    </div>
  );
}

function TimingChart({ items }: { items: Data["items"] }) {
  const W = 640, H = 120, max = Math.max(1, ...items.map((i) => i.timeMs));
  const bw = W / items.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Time spent on each question, in order">
      {items.map((it, i) => {
        const h = Math.max(2, (it.timeMs / max) * (H - 4));
        return (
          <rect key={i} x={i * bw + 1} y={H - h} width={Math.max(1, bw - 2)} height={h}
            className={it.correct ? "fill-primary" : it.response ? "fill-red-500" : "fill-muted-foreground/40"}>
            <title>{`Q${i + 1}: ${Math.round(it.timeMs / 1000)}s, ${it.correct ? "correct" : it.response ? "incorrect" : "not answered"}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export function TestResults({ data, timeZone }: { data: Data; timeZone: string }) {
  const s = data.session;
  const r = s.result as TestResult | null;
  if (s.status === "abandoned" || !r) {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-10">
        <h1 className="text-2xl font-semibold">Test abandoned</h1>
        <p className="text-muted-foreground">Abandoned tests aren&apos;t scored and don&apos;t change your profile.</p>
        <Button className="self-start" render={<Link href="/tests" />}>Back to tests</Button>
      </main>
    );
  }
  const secs = (["rw", "math"] as const).filter((k) => r.sections[k]);
  const scored = r.total != null || secs.some((k) => r.sections[k]!.score != null);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{(s.config as { title?: string }).title ?? KIND[s.kind] ?? s.kind} · {s.completedAt && formatDate(s.completedAt, timeZone)}</p>
        {s.kind === "custom" && (() => {
          const c = s.config as { skillIds?: string[]; tags?: string[]; difficulty?: string; timed?: boolean; count?: number };
          return (
            <p className="text-xs text-muted-foreground">
              {(c.skillIds ?? []).map((id) => SKILL_BY_ID[id]?.name ?? id).join(", ")}
              {c.tags?.length ? ` · sub-topics: ${c.tags.map((t) => t.replace(/-/g, " ")).join(", ")}` : ""}
              {` · ${c.difficulty ?? "mixed"} difficulty · ${c.timed ? "timed" : "untimed"}`}{c.count ? ` · ${c.count} questions` : ""}
            </p>
          );
        })()}
        {r.total != null ? (
          <h1 className="text-3xl font-semibold tabular-nums">Estimated {Math.max(400,r.total - r.halfWidth)} to {Math.min(1600,r.total + r.halfWidth)}</h1>
        ) : (
          <h1 className="text-3xl font-semibold tabular-nums">
            {secs.reduce((a, k) => a + r.sections[k]!.correct, 0)} / {secs.reduce((a, k) => a + r.sections[k]!.total, 0)} correct
          </h1>
        )}
        <div className="flex flex-wrap gap-x-6 text-sm">
          {secs.map((k) => {
            const x = r.sections[k]!;
            return (
              <span key={k}>
                {k === "rw" ? "Reading & Writing" : "Math"}: {x.score != null ? `${Math.max(200,x.score - 30)} to ${Math.min(800,x.score + 30)}` : `${x.correct}/${x.total}`}
                {x.score != null && ` · ${x.correct}/${x.total}`} {ROUTE[x.route] && <span className="text-muted-foreground">· {ROUTE[x.route]}</span>}
              </span>
            );
          })}
        </div>
        {scored && <p className="text-xs text-muted-foreground">This is an estimate. Real SAT scoring works differently. See <Link className="underline" href="/about">how estimates work</Link>.</p>}
      </div>

      {r.insights.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg border p-4 text-sm">{r.insights.map((t) => <li key={t}>• {t}</li>)}</ul>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">By domain</h2>
        {Object.entries(r.byDomain).map(([d, v]) => (
          <div key={d} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
            <span>{DOMAINS[d as DomainId]?.name ?? d}</span>
            <span className="h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-primary" style={{ width: `${(100 * v.correct) / v.total}%` }} /></span>
            <span className="text-right tabular-nums text-muted-foreground">{v.correct}/{v.total}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Time per question</h2>
        <TimingStats timing={data.timing} />
        <TimingChart items={data.items} />
        <p className="text-xs text-muted-foreground">Taller bars took longer. Blue means correct, red means incorrect, and grey means not answered. Hover over a bar for details.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Review every question</h2>
        <p className="text-sm text-muted-foreground">{Math.round(100 * secs.reduce((n,k)=>n+r.sections[k]!.correct,0) / Math.max(1,secs.reduce((n,k)=>n+r.sections[k]!.total,0)))}% correct overall. Your answers and explanations are below.</p>
        {data.items.map((it, i) => (
          <Fragment key={`${it.moduleIdx}-${it.position}`}>
            {(i===0 || data.items[i-1]!.moduleIdx!==it.moduleIdx) && <h3 className="mt-4 font-medium">{it.question.section==="math"?"Math":"Reading and Writing"} · Module {new Set(data.items.filter(x=>x.moduleIdx<=it.moduleIdx && x.question.section===it.question.section).map(x=>x.moduleIdx)).size}</h3>}
            <ReviewItem n={i + 1} q={it.question} response={it.response} correct={it.correct} timeMs={it.timeMs} attemptId={it.attemptId} mistakeType={it.mistakeType} />
          </Fragment>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button render={<Link href="/practice?mode=review" />}>Review mistakes now</Button>
        <Button variant="outline" render={<Link href="/dashboard" />}>Back to dashboard</Button>
      </div>
    </main>
  );
}
