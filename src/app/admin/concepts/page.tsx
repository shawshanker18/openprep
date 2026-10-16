import Link from "next/link";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { skillConcepts } from "@/db/schema";
import { DOMAINS, SKILLS } from "@/content/taxonomy";
import { requireAdmin } from "@/server/admin";

export const metadata = { title: "Concepts" };

export default async function ConceptsPage() {
  await requireAdmin();
  const perSkill = new Map((await db.select({ skillId: skillConcepts.skillId, n: count() }).from(skillConcepts)
    .groupBy(skillConcepts.skillId)).map((r) => [r.skillId, r.n]));
  const domains = [...new Set(SKILLS.map((s) => s.domain))];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Concepts</h1>
        <p className="text-sm text-muted-foreground">Each SAT skill can have concepts. A student who finishes the skill&apos;s lesson can practise one concept at a time. Pick a skill to write its concepts, their explanations and their questions.</p>
      </header>
      {domains.map((d) => (
        <section key={d} aria-labelledby={`domain-${d}`} className="flex flex-col gap-3">
          <h2 id={`domain-${d}`} className="font-medium">{DOMAINS[d as keyof typeof DOMAINS]?.name ?? d}</h2>
          <ul className="flex flex-col divide-y rounded-xl border">
            {SKILLS.filter((s) => s.domain === d).map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 p-4 text-sm">
                <Link href={`/admin/concepts/${s.id}`} className="font-medium underline underline-offset-4">{s.name}</Link>
                <span className="text-muted-foreground">{perSkill.get(s.id) ?? 0} concept{(perSkill.get(s.id) ?? 0) === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
