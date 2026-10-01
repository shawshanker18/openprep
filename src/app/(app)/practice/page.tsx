import { notFound } from "next/navigation";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { PracticeRunner } from "./practice-runner";

export default async function PracticePage({ searchParams }: PageProps<"/practice">) {
  const sp = await searchParams;
  const skillId = typeof sp.skill === "string" ? sp.skill : undefined;
  const d = Number(sp.difficulty);
  const difficulty = d === 1 || d === 2 || d === 3 ? d : undefined;
  if (skillId && !SKILL_BY_ID[skillId]) notFound();
  const mode = sp.mode === "review" ? "review" : skillId ? "skill" : "smart";
  const title = mode === "review" ? "Review" : skillId ? SKILL_BY_ID[skillId]!.name : "Smart practice";
  return <PracticeRunner key={`${mode}-${skillId}-${difficulty}`} mode={mode} skillId={skillId} difficulty={difficulty} title={title} />;
}
