import { Button } from "@/components/ui/button";
import { DiagnosticGate } from "@/components/diagnostic-gate";
import { SKILLS } from "@/content/taxonomy";
import { diagnosticPending, requireUser } from "@/server/auth";
import { skillsWithQuestions } from "@/server/plan";
import { tagsBySkill } from "@/server/practice";
import { SkillTagPicker } from "../skill-tag-picker";

const control = "h-9 rounded-md border bg-background px-2 text-sm";

// A plain GET form: /practice?mode=set&… runs the set in PracticeRunner.
export default async function CustomPracticePage() {
  const { profile } = await requireUser();
  if (diagnosticPending(profile)) return <DiagnosticGate />;
  const [available, tags] = await Promise.all([skillsWithQuestions(), tagsBySkill()]);
  const skills = SKILLS.filter((s) => available.has(s.id));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Custom practice</h1>
      <form action="/practice" method="get" className="flex flex-col gap-3 rounded-xl border p-5">
        <input type="hidden" name="mode" value="set" />
        <div><h2 className="font-medium">Skills</h2><p className="text-sm text-muted-foreground">Leave all unticked for Auto: your focus skills this week.</p></div>
        <SkillTagPicker skills={skills} tagsBySkill={tags} name="skills" />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">Difficulty
            <select name="difficulty" className={control} defaultValue="auto">
              <option value="auto">Auto</option><option value="1">Easy</option><option value="2">Medium</option><option value="3">Hard</option><option value="mixed">Mixed</option>
            </select>
          </label>
          <label className="flex items-center gap-2">Questions <input name="count" type="number" min={5} max={50} defaultValue={10} className={`${control} w-20`} /></label>
          <label className="flex items-center gap-2">Timing
            <select name="timing" className={control} defaultValue="auto">
              <option value="auto">Auto</option><option value="off">Off</option><option value="on">On (SAT pace)</option>
            </select>
          </label>
        </div>
        <p className="text-sm text-muted-foreground">Auto difficulty matches your level. Auto timing adds a countdown only where you&apos;re strong but slow.</p>
        <Button type="submit" className="mt-auto self-start">Start</Button>
      </form>
    </div>
  );
}
