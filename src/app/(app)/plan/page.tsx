import Link from "next/link";
import { PlanBlocks } from "@/components/plan-blocks";
import { DOMAINS, SKILL_BY_ID } from "@/content/taxonomy";
import { DiagnosticGate } from "@/components/diagnostic-gate";
import { diagnosticPending, requireUser } from "@/server/auth";
import { getDashboard } from "@/server/daily";

export default async function PlanPage() {
  const { userId, profile } = await requireUser();
  if (diagnosticPending(profile)) return <DiagnosticGate />;
  const d = await getDashboard(userId, profile);
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Today&apos;s plan</h1>
        <p className="text-sm text-muted-foreground">
          {profile.minutesPerDay} minutes a day · <Link className="underline" href="/settings">change</Link>. The plan is set once a day and doesn&apos;t
          rearrange itself; tomorrow&apos;s reflects what you did today.
        </p>
      </div>
      <PlanBlocks blocks={d.blocks} />
      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Focus this week</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {d.focusMastery.map((f) => (
            <li key={f.id}>
              <Link className="font-medium underline" href={`/skills/${f.id}`}>{f.name}</Link> — {f.mastery}% now. Among the biggest gaps to your target
              in {DOMAINS[SKILL_BY_ID[f.id]!.domain].name}, weighted by how often it&apos;s tested.
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
