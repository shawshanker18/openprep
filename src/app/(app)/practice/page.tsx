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
  const mode = sp.mode === "review" ? "review" : sp.mode === "set" ? "set" : skillId ? "skill" : "smart";
  const { userId, profile } = await requireUser();
  if (diagnosticPending(profile)) return <DiagnosticGate />;
  const bi = Number(sp.block);
  const block = Number.isInteger(bi) && bi >= 0 ? await getTodayBlock(userId, profile, bi) : null;

  if (mode === "set") {
    const skillIds = list(sp.skills).filter((s) => SKILL_BY_ID[s]).slice(0, 29);
    const tags = list(sp.tags).slice(0, 50);
    const n = Number(sp.count);
    const count = Number.isInteger(n) ? Math.min(50, Math.max(5, n)) : 10;
    const timing = sp.timing === "on" || sp.timing === "off" ? sp.timing : "auto";
    const title = skillIds.length === 1 ? SKILL_BY_ID[skillIds[0]!]!.name : skillIds.length ? "Custom practice" : "Custom practice (focus skills)";
    const set = { skillIds, tags, count, timing } as const;
    // Exercises started from the course return there (only course paths are accepted).
    const back = typeof sp.from === "string" && /^\/course(\/[a-z-]+)?$/.test(sp.from) ? sp.from : undefined;
    return <PracticeRunner key={JSON.stringify([set, difficulty])} mode="set" difficulty={difficulty} title={title} block={block} set={set} back={back} />;
  }

  const plain = difficulty === "mixed" ? undefined : difficulty;
  const title = mode === "review" ? (skillId ? `Review · ${SKILL_BY_ID[skillId]!.name}` : "Review") : skillId ? SKILL_BY_ID[skillId]!.name : "Smart practice";
  return <PracticeRunner key={`${mode}-${skillId}-${plain}`} mode={mode} skillId={skillId} difficulty={plain} title={title} block={block} />;
}
