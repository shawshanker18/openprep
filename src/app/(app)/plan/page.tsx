import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlanBlocks } from "@/components/plan-blocks";
import { DOMAINS, SKILLS, SKILL_BY_ID } from "@/content/taxonomy";
import { DiagnosticGate } from "@/components/diagnostic-gate";
import { diagnosticPending, requireUser } from "@/server/auth";
import { getDashboard } from "@/server/daily";
import { addPlanBlock, resetPlan } from "./actions";

const control = "h-9 rounded-md border bg-background px-2 text-sm";
const ERRORS: Record<string, string> = {
  block: "Pick a skill for practice, learn and check-in blocks, and between 5 and 60 minutes.",
  desmos: "You've opened every Desmos lesson already.",
};

export default async function PlanPage({ searchParams }: PageProps<"/plan">) {
  const sp = await searchParams;
  const { userId, profile } = await requireUser();
  if (diagnosticPending(profile)) return <DiagnosticGate />;
  const d = await getDashboard(userId, profile);
  const custom = d.blocks.some((b) => b.custom); // ponytail: removing every block leaves no marker; Reset still shows below
  const canReset = custom || !d.blocks.length;
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Today&apos;s plan</h1>
        <p className="text-sm text-muted-foreground">
          {profile.minutesPerDay} minutes a day · <Link className="underline" href="/settings">change</Link>. The plan is set once a day and doesn&apos;t
          rearrange itself; tomorrow&apos;s reflects what you did today.
        </p>
      </div>
      {typeof sp.error === "string" && Object.hasOwn(ERRORS, sp.error) && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{ERRORS[sp.error]}</p>}
      <section className="flex flex-col gap-2">
        <h2 className="font-medium">{custom ? "Your custom plan" : "Auto (recommended)"}</h2>
        {custom && (
          <p className="text-sm text-muted-foreground">You edited today&apos;s plan. Tomorrow goes back to the automatic plan.</p>
        )}
        <PlanBlocks blocks={d.blocks} removable />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Customize today</h2>
        <form action={addPlanBlock} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">Block
            <select name="kind" defaultValue="practice" className={control}>
              <option value="practice">Practice</option><option value="learn">Learn</option><option value="review">Review mistakes</option>
              <option value="mini">Check-in</option><option value="desmos">Desmos</option>
            </select></label>
          <label className="flex max-w-full flex-col gap-1 text-sm">Skill (practice, learn, check-in)
            <select name="skillId" defaultValue={d.focus[0]} className={`${control} max-w-full`}>
              {SKILLS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></label>
          <label className="flex flex-col gap-1 text-sm">Minutes
            <input name="minutes" type="number" min={5} max={60} step={5} defaultValue={15} required className={`${control} w-24`} /></label>
          <Button type="submit" variant="outline">Add</Button>
        </form>
        {canReset && <form action={resetPlan}><Button type="submit" variant="outline">Reset to automatic</Button></form>}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Focus this week</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {d.focusMastery.map((f) => (
            <li key={f.id}>
              <Link className="font-medium underline" href={`/skills/${f.id}`}>{f.name}</Link>: {f.mastery}% now. Among the biggest gaps to your target
              in {DOMAINS[SKILL_BY_ID[f.id]!.domain].name}, weighted by how often it&apos;s tested.
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
