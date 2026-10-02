import { notFound } from "next/navigation";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { DiagnosticGate } from "@/components/diagnostic-gate";
import { diagnosticPending, requireUser } from "@/server/auth";
import { getTodayBlock } from "@/server/daily";
import { PracticeRunner } from "./practice-runner";

export const metadata = { title: "Practice" };

const list = (v: string | string[] | undefined) => [v ?? []].flat().flatMap((x) => x.split(",")).filter(Boolean);

export default async function PracticePage({ searchParams }: PageProps<"/practice">) {
  const sp = await searchParams;
  const skillId = typeof sp.skill === "string" ? sp.skill : undefined;
  const d = sp.difficulty === "mixed" ? "mixed" : Number(sp.difficulty);
  const difficulty = d === 1 || d === 2 || d === 3 || d === "mixed" ? d : undefined;
  if (skillId && !SKILL_BY_ID[skillId]) notFound();
  const mode = sp.mode === "review" ? "review" : sp.mode === "set" || sp.preset ? "set" : sp.mode === "list" ? "list" : skillId ? "skill" : "smart";
  const { userId, profile } = await requireUser();
  if (diagnosticPending(profile)) return <DiagnosticGate />;
  const bi = Number(sp.block);
  const block = Number.isInteger(bi) && bi >= 0 ? await getTodayBlock(userId, profile, bi) : null;

  // Where to go when the set is finished: the course or the question bank (only these paths are accepted).
  const back = typeof sp.from === "string" && /^\/(course(\/[a-z-]+)?|question-bank(\?[\w=&%.,-]*)?)$/.test(sp.from) ? sp.from : undefined;

  if (mode === "list") {
    const ids = list(sp.ids).filter((id) => /^[a-z0-9-]{3,64}$/.test(id)).slice(0, 50);
    const set = { skillIds: [] as string[], tags: [] as string[], count: ids.length, timing: "off" as const };
    return <PracticeRunner key={ids.join(",")} mode="list" ids={ids} title="Question bank" block={null} set={set} back={back} />;
  }

  // Presets from the sidebar: a quick timed rush on your focus skills, or hard questions from every skill.
  if (sp.preset === "rush" || sp.preset === "challenge") {
    const rush = sp.preset === "rush";
    const set = rush
      ? { skillIds: [] as string[], tags: [] as string[], count: 10, timing: "on" as const }
      : { skillIds: Object.keys(SKILL_BY_ID), tags: [] as string[], count: 10, timing: "off" as const };
    return <PracticeRunner key={sp.preset} mode="set" difficulty={rush ? "mixed" : 3} title={rush ? "Question rush" : "Challenge questions"} block={null} set={set} back={back} />;
  }

  if (mode === "set") {
    const skillIds = list(sp.skills).filter((s) => SKILL_BY_ID[s]).slice(0, 29);
    const tags = list(sp.tags).slice(0, 50);
    const n = Number(sp.count);
    const count = Number.isInteger(n) ? Math.min(50, Math.max(5, n)) : 10;
    const timing = sp.timing === "on" || sp.timing === "off" ? sp.timing : "auto";
    const title = skillIds.length === 1 ? SKILL_BY_ID[skillIds[0]!]!.name : skillIds.length ? "Custom practice" : "Custom practice (focus skills)";
    const set = { skillIds, tags, count, timing } as const;
    return <PracticeRunner key={JSON.stringify([set, difficulty])} mode="set" difficulty={difficulty} title={title} block={block} set={set} back={back} />;
  }

  const plain = difficulty === "mixed" ? undefined : difficulty;
  const title = mode === "review" ? (skillId ? `Review · ${SKILL_BY_ID[skillId]!.name}` : "Review") : skillId ? SKILL_BY_ID[skillId]!.name : "Smart practice";
  return <PracticeRunner key={`${mode}-${skillId}-${plain}`} mode={mode} skillId={skillId} difficulty={plain} title={title} block={block} />;
}
