import Link from "next/link";
import { redirect } from "next/navigation";
import { BankFilters as BankFilterForm } from "@/components/bank-filters";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { DOMAINS, SKILL_BY_ID } from "@/content/taxonomy";
import { activeFilterCount, bankQuery, MAX_SKILLS, parseBankFilters, scopeSkillIds, type BankFilters as Filters } from "@/lib/bank-filters";
import { requireUser } from "@/server/auth";
import { guarded } from "@/server/guard";
import { searchBank } from "@/server/bank-search";
import { publicId } from "@/server/questions";

export const metadata = { title: "Question bank" };

const DIFF = { 1: "Easy", 2: "Medium", 3: "Hard" } as const;
const SUBJECT = { math: "Math", rw: "Reading and Writing" } as const;

export default async function QuestionBankPage({ searchParams }: PageProps<"/question-bank">) {
  const f = parseBankFilters(await searchParams);
  const { userId } = await requireUser();
  const { total, pages, rows } = await guarded(searchBank(userId, f));
  const pageHref = (n: number) => `/question-bank${bankQuery({ ...f, page: n }, { keepPage: true })}`;
  if (f.page > pages) redirect(pageHref(pages));

  const back = `/question-bank${bankQuery(f, { keepPage: true })}`;
  const drop = (patch: Partial<Filters>) => `/question-bank${bankQuery({ ...f, ...patch, page: 1 })}`;
  const chips: { label: string; href: string }[] = [
    ...(f.q ? [{ label: `"${f.q}"`, href: drop({ q: "" }) }] : []),
    ...(f.subject ? [{ label: SUBJECT[f.subject], href: drop({ subject: null, domains: [], skills: [] }) }] : []),
    ...f.domains.map((d) => ({ label: DOMAINS[d].name, href: drop({ domains: f.domains.filter((x) => x !== d), skills: f.skills.filter((k) => SKILL_BY_ID[k]!.domain !== d) }) })),
    ...f.skills.map((k) => ({ label: SKILL_BY_ID[k]!.name, href: drop({ skills: f.skills.filter((x) => x !== k) }) })),
    ...(f.difficulties.length < 3 ? [{ label: f.difficulties.map((d) => DIFF[d]).join(" + "), href: drop({ difficulties: [1, 2, 3] }) }] : []),
    ...(f.status !== "any" ? [{ label: f.status === "unattempted" ? "Not attempted" : f.status === "attempted" ? "Attempted" : "Missed", href: drop({ status: "any" }) }] : []),
    ...(f.saved ? [{ label: "Saved", href: drop({ saved: false }) }] : []),
  ];

  // Practice these: every skill in scope, as one practice set.
  const scopeSkills = scopeSkillIds(f);
  const practiceSet = new URLSearchParams({ mode: "set", from: back, skills: scopeSkills.join(","), difficulties: f.difficulties.join(","), count: String(f.count), timing: "off" });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Question bank</h1>
        <p className="text-muted-foreground">Find questions by subject, topic, skill and difficulty. Open one to answer it and see the explanation, then come back to these results.</p>
      </header>

      <BankFilterForm subject={f.subject} domains={f.domains} skills={f.skills} difficulties={f.difficulties} status={f.status} saved={f.saved} q={f.q} count={f.count} />

      <section aria-labelledby="results" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="results" className="font-medium" aria-live="polite">
            {total === 0 ? "No questions match" : `${total.toLocaleString()} question${total === 1 ? "" : "s"}`}
          </h2>
          {scopeSkills.length > 0 && scopeSkills.length <= MAX_SKILLS && total > 0 ? (
            <Button variant="outline" size="sm" render={<Link href={`/practice?${practiceSet}`} prefetch={false} />}>Practice these</Button>
          ) : scopeSkills.length > MAX_SKILLS ? (
            <p className="text-sm text-muted-foreground">Choose a topic or skill to practice these as a set.</p>
          ) : null}
        </div>

        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Active filters">
            {chips.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="inline-flex min-h-9 items-center gap-1 text-sm underline underline-offset-4">
                  {c.label}<span aria-hidden>×</span><span className="sr-only">Remove filter</span>
                </Link>
              </li>
            ))}
            <li><Link href="/question-bank" className="inline-flex min-h-9 items-center text-sm underline underline-offset-4">Clear all ({activeFilterCount(f)})</Link></li>
          </ul>
        )}

        {rows.length === 0 ? (
          <div className="flex flex-col gap-3 rounded-xl border p-5 text-sm">
            <p>{f.saved ? "You have no saved questions that match these filters." : "Nothing matches these filters yet."}</p>
            <p className="text-muted-foreground">Try a broader topic, more difficulty levels, or clear the search text.</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>{SUBJECT[r.section]}</span><span aria-hidden>·</span>
                  <span>{DOMAINS[r.domain].name}</span><span aria-hidden>·</span>
                  <span>{SKILL_BY_ID[r.skillId]?.name}</span><span aria-hidden>·</span>
                  <span>{DIFF[r.difficulty]} (SAT)</span>
                  {r.attempted && <><span aria-hidden>·</span><span>{r.missed ? "Missed before" : "Attempted"}</span></>}
                  {r.saved && <><span aria-hidden>·</span><span>Saved</span></>}
                </div>
                <div className="line-clamp-3 text-sm">
                  <Markdown>{r.stem}</Markdown>
                </div>
                <div>
                  <Button variant="outline" size="sm" render={<Link href={`/practice?${new URLSearchParams({ mode: "list", ids: publicId(r.id, userId), from: back })}`} prefetch={false} />}>
                    Open question<span className="sr-only"> about {SKILL_BY_ID[r.skillId]?.name}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm">
            {f.page > 1 ? <Link className="min-h-11 inline-flex items-center underline underline-offset-4" href={pageHref(f.page - 1)}>Previous</Link> : <span />}
            <span className="text-muted-foreground tabular-nums">Page {f.page} of {pages}</span>
            {f.page < pages ? <Link className="min-h-11 inline-flex items-center underline underline-offset-4" href={pageHref(f.page + 1)}>Next</Link> : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}
