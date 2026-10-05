import { notFound } from "next/navigation";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { requireUser } from "@/server/auth";
import { getTodayBlock } from "@/server/daily";
import { createPaper } from "@/server/papers";
import { PracticeRunner } from "./practice-runner";

export const metadata = { title: "Practice" };

const list = (v: string | string[] | undefined) => [v ?? []].flat().flatMap((x) => x.split(",")).filter(Boolean);

export default async function PracticePage({ searchParams }: PageProps<"/practice">) {
  const sp = await searchParams;
  const skillId = typeof sp.skill === "string" ? sp.skill : undefined;
  const d = sp.difficulty === "mixed" ? "mixed" : Number(sp.difficulty);
  const difficulty = d === 1 || d === 2 || d === 3 || d === "mixed" ? d : undefined;
  if (skillId && !SKILL_BY_ID[skillId]) notFound();
  const mode = sp.mode === "review" ? "review" : sp.mode === "set" ? "set" : sp.mode === "list" ? "list" : skillId ? "skill" : "smart";
  const { userId, profile } = await requireUser();
  const bi = Number(sp.block);
  const block = Number.isInteger(bi) && bi >= 0 ? await getTodayBlock(userId, profile, bi) : null;

  // Where to go when the set is finished: the course or the question bank (only these paths are accepted).
  const back = typeof sp.from === "string" && /^\/(course(\/[a-z-]+)?|question-bank(\?[\w=&%.,-]*)?|bookmarks(\?page=\d+)?)$/.test(sp.from) ? sp.from : undefined;

  if (mode === "list") {
    const ids = list(sp.ids).filter((id) => /^[\w-]{22}$/.test(id)).slice(0, 50);
    const set = { skillIds: [] as string[], tags: [] as string[], count: ids.length, timing: "off" as const };
    const paperId=createPaper(userId, {mode:"list",ids});
    return <PracticeRunner key={paperId} userId={userId} paperId={paperId} mode="list" title={back?.startsWith('/bookmarks')?'Saved question':'Question bank'} block={null} set={{count:set.count}} back={back} />;
  }

  if (mode === "set") {
    const skillIds = list(sp.skills).filter((s) => SKILL_BY_ID[s]).slice(0, 29);
    const tags = list(sp.tags).filter(t=>t.length<=64).slice(0, 50);
    const n = Number(sp.count);
    const count = Number.isInteger(n) ? Math.min(50, Math.max(5, n)) : 10;
    const timing = sp.timing === "on" || sp.timing === "off" ? sp.timing : "auto";
    const title = skillIds.length === 1 ? SKILL_BY_ID[skillIds[0]!]!.name : skillIds.length ? "Custom practice" : "Custom practice (focus skills)";
    const set = { skillIds, tags, count, timing } as const;
    const paperId=createPaper(userId, {mode:"set", difficulty, ...set});
    return <PracticeRunner key={paperId} userId={userId} paperId={paperId} mode="set" title={title} block={block} set={{count:set.count}} back={back} />;
  }

  const plain = difficulty === "mixed" ? undefined : difficulty;
  const title = mode === "review" ? (skillId ? `Review · ${SKILL_BY_ID[skillId]!.name}` : "Review") : skillId ? SKILL_BY_ID[skillId]!.name : "Smart practice";
  const paperId=createPaper(userId, {mode,skillId,difficulty:plain});
  return <PracticeRunner key={paperId} userId={userId} paperId={paperId} mode={mode} title={title} block={block} />;
}
