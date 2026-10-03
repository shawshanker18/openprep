import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { SKILLS } from "@/content/taxonomy";
import type { TestResult } from "@/engine/score";
import { DiagnosticGate } from "@/components/diagnostic-gate";
import { diagnosticPending, requireUser } from "@/server/auth";
import { skillsWithQuestions } from "@/server/plan";
import { tagsBySkill } from "@/server/practice";
import { freshFullMock, listTests, openTests, TESTS_PER_PAGE } from "@/server/tests";
import { SkillTagPicker } from "../practice/skill-tag-picker";
import { abandon } from "@/app/test/[sessionId]/actions";
import { startTestAction } from "./actions";
import { Choice } from "@/components/ui/choice";

export const metadata = { title: "Practice tests" };

const KIND = { full: "Full practice test", section: "Section test", module: "Single module", mini: "Mini test", weakness: "Weakness test", custom: "Custom test", diagnostic: "Diagnostic" } as Record<string, string>;
const ERR: Record<string, string> = { empty: "There aren't enough questions for that test yet.", invalid: "Please check the test options.", rate: "Too many tests started in a few minutes. Please wait a moment and try again." };
const control = "h-9 rounded-md border bg-background px-2 text-sm";

function StartCard({ title, time, children, fields }: { title: string; time: string; children: React.ReactNode; fields: React.ReactNode }) {
  return (
    <form action={startTestAction} className="flex min-w-0 flex-col gap-3 rounded-xl border p-5">
      <div><h2 className="font-medium">{title}</h2><p className="text-sm text-muted-foreground">{time}</p></div>
      <p className="text-sm">{children}</p>
      {fields}
      <Button type="submit" className="mt-auto self-start">Start</Button>
    </form>
  );
}

export default async function TestsPage({ searchParams }: PageProps<"/tests">) {
  const sp = await searchParams;
  const { userId, profile } = await requireUser();
  if (diagnosticPending(profile)) return <DiagnosticGate />;
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const [found, running, available, tags, fresh] = await Promise.all([listTests(userId, page), openTests(userId), skillsWithQuestions(), tagsBySkill(), freshFullMock(userId)]);
  const history = found.slice(0, TESTS_PER_PAGE);
  const more = found.length > TESTS_PER_PAGE;
  const open = running.filter((t) => t.kind !== "diagnostic");
  const skills = SKILLS.filter((s) => available.has(s.id));
  const sectionPick = (
    <Choice name="section" defaultValue="rw" aria-label="Section" className="sm:w-56" options={[{ value: "rw", label: "Reading and Writing" }, { value: "math", label: "Math" }]} />
  );

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Tests</h1>
      {typeof sp.error === "string" && Object.hasOwn(ERR, sp.error) && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{ERR[sp.error]}</p>}
      {sp.resume && <p role="alert" className="rounded-md border p-3 text-sm">Finish or abandon your test in progress before starting another full or section test.</p>}

      {open.map((t) => (
        <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary p-4">
          <span className="text-sm"><b>{KIND[t.kind]}</b> in progress · started {formatDate(t.startedAt, profile.timezone, true)}</span>
          <div className="flex gap-2">
            <Button render={<Link href={`/test/${t.id}`} />}>Resume</Button>
            <form action={abandon.bind(null, t.id)}><Button variant="outline" type="submit">Abandon</Button></form>
          </div>
        </div>
      ))}

      {!fresh && <p className="rounded-md border p-3 text-sm">You&apos;ve seen most of our questions for a full practice test. More are being added; you can still take one, but some questions will repeat.</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <StartCard title="Full practice test" time="2 h 14 min · 98 questions + 10-min break" fields={<input type="hidden" name="kind" value="full" />}>
          Both sections, adaptive like the real test: how you do in each first module sets the difficulty of the second.
        </StartCard>
        <StartCard title="Section test" time="64 to 70 min · two adaptive modules" fields={<><input type="hidden" name="kind" value="section" />{sectionPick}</>}>
          One full section with routing to an easier or harder second module.
        </StartCard>
        <StartCard title="Single module" time="32 to 35 min" fields={<><input type="hidden" name="kind" value="module" />{sectionPick}</>}>
          One timed module at mixed difficulty. Raw score only.
        </StartCard>
        <StartCard title="Mini test" time="12 to 15 min · up to 10 questions" fields={<>
          <input type="hidden" name="kind" value="mini" />
          <Choice name="skillId" required aria-label="Skill" defaultValue={skills[0]?.id} className="max-w-full" options={skills.map((s) => ({ value: s.id, label: s.name }))} />
        </>}>
          A quick check on one skill.
        </StartCard>
        <StartCard title="Weakness test" time="Untimed · 5 questions per focus skill" fields={<input type="hidden" name="kind" value="weakness" />}>
          Targets this week&apos;s focus skills at the right difficulty for you.
        </StartCard>
        <StartCard title="Custom test" time="You choose" fields={<>
          <input type="hidden" name="kind" value="custom" />
          <SkillTagPicker skills={skills} tagsBySkill={tags} name="skillIds" />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Choice name="difficulty" defaultValue="mixed" aria-label="Difficulty" className="w-32" options={[{ value: "mixed", label: "Mixed" }, { value: "1", label: "Easy" },
              { value: "2", label: "Medium" }, { value: "3", label: "Hard" }]} />
            <label className="flex items-center gap-2">Questions <input name="count" type="number" min={5} max={30} defaultValue={10} className={`${control} w-20`} /></label>
            <label className="flex items-center gap-2"><input type="checkbox" name="timed" defaultChecked /> Timed</label>
          </div>
        </>}>
          Pick skills, sub-topics, difficulty, length, and timing.
        </StartCard>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">History</h2>
        {history.length === 0 ? <p className="text-sm text-muted-foreground">{page > 1 ? "No older tests." : "No tests yet."}</p> : (
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground"><tr><th className="py-1 font-normal">Date</th><th className="font-normal">Test</th><th className="font-normal">Result</th><th /></tr></thead>
            <tbody>
              {history.map((t) => {
                const r = t.result as (TestResult & { total?: { total: number } }) | null;
                const label = t.status !== "completed" ? t.status.replace("_", " ")
                  : t.kind === "diagnostic" ? "Profile"
                  : typeof r?.total === "number" ? `≈ ${r.total}`
                  : r?.sections ? Object.values(r.sections).map((x) => `${x!.correct}/${x!.total}`).join(" · ") : "Not scored";
                return (
                  <tr key={t.id} className="border-t">
                    <td className="py-2 tabular-nums">{formatDate(t.startedAt, profile.timezone)}</td>
                    <td>{KIND[t.kind] ?? t.kind}</td>
                    <td className="tabular-nums">{label}</td>
                    <td className="text-right"><Link className="underline" href={t.status === "in_progress" ? `/test/${t.id}` : `/test/${t.id}/results`}>{t.status === "in_progress" ? "Resume" : "View"}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
