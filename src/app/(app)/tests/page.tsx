import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { testLabel } from "@/lib/test-label";
import { Button } from "@/components/ui/button";
import { BrandBanner } from "@/components/brand";
import { PAPERS } from "@/engine/paper";
import type { Route } from "@/engine/assemble";
import type { TestResult } from "@/engine/score";
import { requireUser } from "@/server/auth";
import { completedPracticeTests, listTests, openTestProgress, openTests, TESTS_PER_PAGE } from "@/server/tests";
import { abandon } from "@/app/test/[sessionId]/actions";
import { startTestAction } from "./actions";
import { ScopeButton } from "@/components/scope-button";

export const metadata = { title: "Practice tests" };

const ERR: Record<string, string> = { empty: "There aren't enough questions for that test yet.", invalid: "Please check the test options.", rate: "Too many tests started in a few minutes. Please wait a moment and try again." };
const SECTIONS = [
  { id: "math", name: "Math" },
  { id: "rw", name: "Reading and Writing" },
] as const;
const MODULES: { route: Route; label: string }[] = [{ route: "base", label: "Module 1" }, { route: "easy", label: "Module 2 · Easy" }, { route: "hard", label: "Module 2 · Hard" }];
const MODULES_IN: Record<string, number> = { full: 4, section: 2 };
const ROUTE_NAME: Record<string, string> = { base: "Module 1", easy: "Module 2 (easy)", hard: "Module 2 (hard)" };
const STATUS_STYLE: Record<string, string> = { completed: "border-emerald-600/40 text-emerald-700 dark:text-emerald-400", in_progress: "border-primary text-foreground", abandoned: "text-muted-foreground" };

type Cfg = { paper?: number; route?: string; sections?: string[] };
const cfg = (t: { config: unknown }) => t.config as Cfg;
const total = (t: { result: unknown }) => (t.result as TestResult | null)?.total ?? null;
/** "≈ 640 (35/44)" for a scored section, "17/22" for a raw one. */
const sectionCell = (r: TestResult | null, s: "math" | "rw") => {
  const x = r?.sections?.[s];
  return x ? (x.score != null ? `≈ ${x.score} (${x.correct}/${x.total})` : `${x.correct}/${x.total}`) : "—";
};

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl border bg-card p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export default async function TestsPage({ searchParams }: PageProps<"/tests">) {
  const sp = await searchParams;
  const { userId, profile } = await requireUser();
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const [found, running, done] = await Promise.all([listTests(userId, page), openTests(userId), completedPracticeTests(userId)]);
  const history = found.slice(0, TESTS_PER_PAGE);
  const more = found.length > TESTS_PER_PAGE;
  const open = running.filter((t) => t.kind !== "diagnostic");
  const progress = await openTestProgress(open.map((t) => t.id));

  const scored = done.filter((t) => total(t) != null);
  const best = (pick: (r: TestResult) => number | null | undefined) => Math.max(0, ...done.map((t) => pick(t.result as TestResult) ?? 0)) || null;
  const bestTotal = best((r) => r.total), bestMath = best((r) => r.sections?.math?.score), bestRw = best((r) => r.sections?.rw?.score);
  const latest = scored[0];

  return (
    <div className="flex flex-col gap-6">
      <BrandBanner eyebrow="Practice" title="Tests" description="Timed, adaptive practice tests that feel like the real SAT." />
      {typeof sp.error === "string" && Object.hasOwn(ERR, sp.error) && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{ERR[sp.error]}</p>}
      {sp.resume && <p role="alert" className="rounded-md border p-3 text-sm">Finish or abandon your test in progress before starting another full or section test.</p>}

      <section aria-label="Your scores" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Best total" value={bestTotal ? `≈ ${bestTotal}` : "—"} sub={latest ? `Latest ≈ ${total(latest)} · ${formatDate(latest.completedAt!, profile.timezone)}` : "Finish a full test to get one"} />
        <Tile label="Best Math" value={bestMath ? `≈ ${bestMath}` : "—"} sub="out of 800" />
        <Tile label="Best Reading and Writing" value={bestRw ? `≈ ${bestRw}` : "—"} sub="out of 800" />
        <Tile label="Tests finished" value={String(done.length)} sub={open.length ? `${open.length} in progress` : "Nothing in progress"} />
      </section>

      {open.length > 0 && (
        <section aria-label="In progress" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">In progress</h2>
          {open.map((t) => {
            const p = progress.get(t.id) ?? { done: 0 };
            const of = MODULES_IN[t.kind] ?? 1;
            return (
              <div key={t.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-primary bg-card p-4">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="font-medium">{testLabel(t.kind, t.config)}</p>
                  <p className="text-sm text-muted-foreground">
                    Started {formatDate(t.startedAt, profile.timezone, true)}
                    {p.section && ` · now on ${p.section === "math" ? "Math" : "Reading and Writing"} ${ROUTE_NAME[p.route ?? "base"]}`}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-primary" style={{ width: `${Math.min(100, (100 * p.done) / of)}%` }} /></span>
                    <span className="text-xs tabular-nums text-muted-foreground">{p.done}/{of} modules done</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button render={<Link href={`/test/${t.id}`} />}>Resume</Button>
                  <form action={abandon.bind(null, t.id)}><Button variant="outline" type="submit">Abandon</Button></form>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section aria-label="Practice tests" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Practice tests</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {PAPERS.map((n) => {
            const mine = done.filter((t) => cfg(t).paper === n);
            const fulls = mine.filter((t) => t.kind === "full" && total(t) != null);
            const last = fulls[0]?.result as TestResult | undefined;
            const openHere = open.find((t) => cfg(t).paper === n);
            const openFull = open.find((t) => cfg(t).paper === n && t.kind === "full");
            return (
              <form key={n} action={startTestAction} className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5">
                <input type="hidden" name="paper" value={n} />
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">Practice Test {n}</h3>
                    <p className="text-sm text-muted-foreground">98 questions · 2 h 14 min · 10-min break</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${openHere ? STATUS_STYLE.in_progress : STATUS_STYLE[mine.length ? "completed" : "abandoned"]}`}>
                    {openHere ? "In progress" : mine.length ? `${mine.length} finished` : "Not started"}
                  </span>
                </header>

                <dl className="grid grid-cols-3 gap-2 text-center">
                  {[["Last total", last?.total], ["Last Math", last?.sections.math?.score], ["Last R&W", last?.sections.rw?.score]].map(([k, v]) => (
                    <div key={String(k)} className="rounded-lg bg-muted/50 px-2 py-2">
                      <dt className="text-xs text-muted-foreground">{k}</dt>
                      <dd className="text-lg font-semibold tabular-nums">{v ? `≈ ${v}` : "—"}</dd>
                    </div>
                  ))}
                </dl>

                {openFull
                  ? <Button size="lg" render={<Link href={`/test/${openFull.id}`} />}>Resume full test</Button>
                  : <ScopeButton value="full" variant="default" size="lg" className="w-full">Start full test</ScopeButton>}

                <div className="group rounded-lg border">
                  <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium">
                    Individual modules
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-focus-within:rotate-180 group-hover:rotate-180" />
                  </button>
                  <div className="hidden flex-col gap-3 border-t p-3 group-focus-within:flex group-hover:flex">
                    {SECTIONS.map((s) => (
                      <div key={s.id} className="flex flex-col gap-1.5">
                        <h4 className="text-sm font-medium">{s.name}</h4>
                        <div className="grid grid-cols-3 gap-1.5">
                          {MODULES.map((m) => {
                            const prev = mine.find((t) => t.kind === "module" && cfg(t).sections?.[0] === s.id && cfg(t).route === m.route);
                            const x = (prev?.result as TestResult | undefined)?.sections[s.id];
                            return (
                              <ScopeButton key={m.route} value={`${s.id}:${m.route}`} size="sm" className="h-auto min-w-0 flex-col gap-0 whitespace-normal py-1.5 text-xs leading-tight">
                                <span>{m.label}</span>
                                <span className="font-normal text-muted-foreground tabular-nums">{x ? `Last ${x.correct}/${x.total}` : "Not taken"}</span>
                              </ScopeButton>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            );
          })}
        </div>
      </section>

      <section id="history" className="flex scroll-mt-4 flex-col gap-3">
        <h2 className="text-lg font-semibold">History</h2>
        {history.length === 0 ? <p className="rounded-xl border p-6 text-sm text-muted-foreground">{page > 1 ? "No older tests." : "No tests yet. Start a practice test above and your scores will show up here."}</p> : (
          <div className="max-w-full overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground"><tr>
              {["Date", "Test", "Status", "Math", "Reading and Writing", "Total", ""].map((h, i) => <th key={i} className="px-4 py-2.5 font-normal">{h}</th>)}
            </tr></thead>
            <tbody>
              {history.map((t) => {
                const r = t.status === "completed" ? t.result as TestResult | null : null;
                const diagnostic = t.kind === "diagnostic";
                return (
                  <tr key={t.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 tabular-nums">{formatDate(t.startedAt, profile.timezone)}</td>
                    <td className="px-4 py-3 font-medium">{testLabel(t.kind, t.config)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[t.status] ?? ""}`}>{t.status.replace("_", " ")}</span></td>
                    <td className="px-4 py-3 tabular-nums">{diagnostic ? "—" : sectionCell(r, "math")}</td>
                    <td className="px-4 py-3 tabular-nums">{diagnostic ? "—" : sectionCell(r, "rw")}</td>
                    <td className="px-4 py-3 tabular-nums">{r?.total != null ? `≈ ${r.total}` : "—"}</td>
                    <td className="px-4 py-3 text-right"><Link className="underline" href={t.status === "in_progress" ? `/test/${t.id}` : `/test/${t.id}/results${diagnostic && t.status === "completed" ? "?review=mistakes" : ""}`}>{t.status === "in_progress" ? "Resume" : diagnostic && t.status === "completed" ? "Review mistakes" : "View"}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
        {(page > 1 || more) && (
          <nav className="flex items-center justify-between text-sm" aria-label="History pages">
            {page > 1 ? <Link className="underline" href={page === 2 ? "/tests" : `/tests?page=${page - 1}`}>Newer</Link> : <span />}
            <span className="text-muted-foreground">Page {page}</span>
            {more ? <Link className="underline" href={`/tests?page=${page + 1}`}>Older</Link> : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}
