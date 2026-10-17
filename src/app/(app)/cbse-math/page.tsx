import Link from "next/link";
import { BrandBanner } from "@/components/brand";
import { likelyCoveredSkills } from "@/lib/curriculum-coverage";
import { CBSE_CHAPTERS } from "@/content/cbse-chapters";
import { DOMAINS, SKILLS, skillsIn, type DomainId } from "@/content/taxonomy";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Maths for CBSE students" };

const MATH_DOMAINS = (Object.keys(DOMAINS) as DomainId[]).filter((d) => DOMAINS[d].section === "math");
const MATH_SKILL_COUNT = SKILLS.filter((s) => s.section === "math").length;

// Which CBSE chapters teach each SAT skill, so every skill can say where the student met it.
const chaptersBySkill = new Map<string, string[]>();
for (const ch of CBSE_CHAPTERS) {
  if (ch.active === false) continue;
  for (const id of ch.skills) chaptersBySkill.set(id, [...(chaptersBySkill.get(id) ?? []), `${ch.title} (Class ${ch.grade})`]);
}

const SWITCHES = [
  ["Solve two equations", "Substitute and simplify by hand", "Graph both, then click where they cross"],
  ["Find an unknown constant k", "Compare coefficients on paper", "Type k, add a slider, and drag until the lines match"],
  ["Find a line through data", "Work out the slope and intercept", "Enter the points as lists, then type y_1 \\sim m x_1 + b"],
  ["Check an answer choice", "Substitute and simplify", "Graph the choice on top of the original and see if they match"],
] as const;

export default async function CbseMathPage() {
  const { profile } = await requireUser();
  const covered = likelyCoveredSkills(profile);
  const coveredCount = SKILLS.filter((s) => s.section === "math" && covered.has(s.id)).length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <BrandBanner eyebrow="Maths for CBSE students" title="How the SAT maths test works" description="Most of the arithmetic is done for you. Your job is to turn the words into an equation, then let the calculator and Desmos do the rest." />

      <section aria-labelledby="big-change" className="flex flex-col gap-3">
        <h2 id="big-change" className="text-xl font-semibold">The big change from CBSE</h2>
        <p className="text-muted-foreground">In class you practise solving by hand. On the SAT you rarely need to, because the built-in Desmos calculator is there for the whole maths section. The test checks whether you can set up the problem and read the answer, not whether you can simplify quickly on paper.</p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li><span className="font-medium">Paste the numbers in and read the answer.</span> Long simplification is rarely the point of a question.</li>
          <li><span className="font-medium">Desmos solves several equations at once.</span> Graph them together, and the crossing points are the solutions.</li>
          <li><span className="font-medium">Sliders find constants.</span> Type a letter, add a slider, and drag it until the graph does what the question describes.</li>
          <li><span className="font-medium">Regression fits data.</span> Enter the points as lists and Desmos gives the line of best fit.</li>
        </ul>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr><th className="p-3 font-semibold">Task</th><th className="p-3 font-semibold">CBSE habit</th><th className="p-3 font-semibold">SAT habit</th></tr>
            </thead>
            <tbody>
              {SWITCHES.map(([task, cbse, sat]) => (
                <tr key={task} className="border-t align-top">
                  <td className="p-3 font-medium">{task}</td>
                  <td className="p-3 text-muted-foreground">{cbse}</td>
                  <td className="p-3">{sat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">The Desmos lessons show each of these step by step. Start with <Link href="/desmos" className="underline">Desmos on the SAT</Link>.</p>
      </section>

      <section aria-labelledby="areas" className="flex flex-col gap-3">
        <h2 id="areas" className="text-xl font-semibold">The four areas tested</h2>
        <p className="text-muted-foreground">
          You have already met {coveredCount} of the {MATH_SKILL_COUNT} SAT maths skills in your chapters.
          Badges mark the skills your school syllabus likely covers. The rest are usually new, so they are where to spend your time.
        </p>
        {MATH_DOMAINS.map((d) => (
          <div key={d} className="flex flex-col gap-2 rounded-xl border p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-semibold">{DOMAINS[d].name}</h3>
              <span className="text-sm text-muted-foreground">{Math.round(DOMAINS[d].weight * 100)}% of the section</span>
            </div>
            <ul className="flex flex-col divide-y">
              {skillsIn(d).map((s) => {
                const chapters = chaptersBySkill.get(s.id) ?? [];
                return (
                  <li key={s.id} className="flex flex-col gap-1 py-2 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{s.name}</span>
                      {covered.has(s.id) ? <span className="rounded bg-black px-2 py-0.5 text-xs text-white">Likely covered in school</span> : <span className="rounded border px-2 py-0.5 text-xs text-muted-foreground">Usually new</span>}
                    </span>
                    {chapters.length > 0 && <span className="text-xs text-muted-foreground">CBSE: {chapters.join(", ")}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="next" className="flex flex-col gap-2 rounded-xl border p-5">
        <h2 id="next" className="font-semibold">Where to start</h2>
        <p className="text-sm text-muted-foreground">Work through the Desmos lessons first, then the maths topics marked <span className="font-medium text-foreground">Usually new</span> in order. Practice questions for each topic are in <Link href="/start" className="underline">Start from scratch</Link>.</p>
      </section>
    </div>
  );
}
