import Link from "next/link";
import { Button } from "@/components/ui/button";
import {DeliveryBlockedView} from "@/components/delivery-blocked";
import { DeliveryBlocked } from "@/server/delivery-policy";
import { notFound, redirect } from "next/navigation";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { getTodayBlock } from "@/server/daily";
import { getAuthUser, requireUser } from "@/server/auth";
import { safely } from "@/lib/safely";
import { createPracticeSession, getPracticeSession, listPracticeSessions } from "@/server/practice-sessions";
import { z } from "zod";
import { ACCEPTED_SET_SIZES, MAX_QUESTIONS_PER_SET } from "@/lib/question-limits";
import { PracticeRunner } from "./practice-runner";
import { PracticeSetup } from "@/components/practice-setup";
import { getTier } from "@/server/subscription";

export const metadata = { title: "Adaptive Practice" };

const list = (v: string | string[] | undefined) => [v ?? []].flat().flatMap((x) => x.split(",")).filter(Boolean);

async function loadPage({ searchParams }: PageProps<"/practice">) {
  const sp = await searchParams;
  const { userId, profile } = await requireUser();
  if (Object.keys(sp).length === 0) {
    const saved = (await listPracticeSessions(userId)).find(s => s.status === 'active');
    return <div className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Adaptive Practice</h1>
      {saved && <section className="rounded-xl border p-5"><h2 className="font-medium">Continue practicing</h2><p className="mb-3 text-sm">{saved.title}</p><Button render={<Link href={`/practice?session=${saved.id}`} />}>Resume session</Button></section>}
      <PracticeSetup />
      <div className="flex gap-4 text-sm"><Link className="underline" href="/practice/sessions">Saved sessions</Link><Link className="underline" href="/start">Start from scratch</Link><Link className="underline" href="/desmos">Desmos</Link></div>
    </div>;
  }
  const bi=Number(sp.block);
  const block=Number.isInteger(bi) && bi>=0 ? await getTodayBlock(userId,profile,bi) : null;
  const blockQuery=block?`&block=${block.index}`:"";
  if (sp.session !== undefined) {
    const parsed = z.uuid().safeParse(sp.session);
    if (!parsed.success) notFound();
    const session = await getPracticeSession(userId, parsed.data);
    if (!session) notFound();
    const studentName=(await safely(()=>getAuthUser(),null))?.name??undefined;
    return <PracticeRunner key={session.id} userId={userId} sessionId={session.id} mode={session.config.mode} studentName={studentName}
      title={session.title} block={block} set={{count:session.config.count??MAX_QUESTIONS_PER_SET}} back={session.back??undefined} tier={await getTier(userId)} />;
  }
  const skillId = typeof sp.skill === "string" ? sp.skill : undefined;
  const d = sp.difficulty === "mixed" ? "mixed" : Number(sp.difficulty);
  const difficulty = d === 1 || d === 2 || d === 3 || d === "mixed" ? d : undefined;
  if (skillId && !SKILL_BY_ID[skillId]) notFound();
  const mode = sp.mode === "review" ? "review" : sp.mode === "set" ? "set" : sp.mode === "list" ? "list" : skillId ? "skill" : "smart";

  // Where to go when the set is finished: the course or the question bank (only these paths are accepted).
  const back = typeof sp.from === "string" && /^\/(start(\/[a-z0-9-]+)?|course(\/[a-z0-9-]+)?|question-bank(\?[\w=&%.,-]*)?|bookmarks(\?page=\d+)?|analysis)$/.test(sp.from) ? sp.from : undefined;

  if (mode === "list") {
    const ids = list(sp.ids).filter((id) => /^[\w-]{22}$/.test(id)).slice(0, MAX_QUESTIONS_PER_SET);
    const sessionId=await createPracticeSession(userId, {mode:"list",ids,count:Math.max(1,ids.length)},back?.startsWith('/bookmarks')?'Saved questions':'Question bank',back);
    redirect(`/practice?session=${sessionId}${blockQuery}`);
  }

  if (mode === "set") {
    const difficultyValues = list(sp.difficulties);
    if (difficultyValues.some(v=>!['1','2','3'].includes(v)) || difficultyValues.length>3) notFound();
    const difficulties = difficultyValues.length ? [...new Set(difficultyValues.map(Number))] as (1|2|3)[] : undefined;
    const skillIds = list(sp.skills).filter((s) => SKILL_BY_ID[s]).slice(0, 29);
    if (list(sp.skills).length !== skillIds.length) notFound();
    const tags = list(sp.tags);
    if (tags.length > 1 || tags.some(tag => tag !== "desmos")) notFound();
    const n = Number(sp.count);
    const count = sp.count === undefined ? 10 : n;
    if (!ACCEPTED_SET_SIZES.includes(count)) notFound();
    const timing = sp.timing === "on" || sp.timing === "off" ? sp.timing : "auto";
    if (!back && !skillIds.length) notFound();
    const title = skillIds.length === 1 ? SKILL_BY_ID[skillIds[0]!]!.name : "Question bank";
    const set = { skillIds, tags, count, timing } as const;
    const sessionId=await createPracticeSession(userId, {mode:"set", difficulty, difficulties, ...set},title,back);
    redirect(`/practice?session=${sessionId}${blockQuery}`);
  }

  const plain = difficulty === "mixed" ? undefined : difficulty;
  if (mode === "smart") {
    // Adaptive: optional skill list (empty = weekly focus), a set length and a timer choice.
    const chosen = list(sp.skills);
    if (chosen.some((x) => !SKILL_BY_ID[x]) || chosen.length > 29) notFound();
    const length = sp.count === undefined ? 10 : Number(sp.count);
    if (!ACCEPTED_SET_SIZES.includes(length)) notFound();
    const timing = sp.timing === "off" ? "off" : "auto";
    const named = chosen.length === 1 ? `${SKILL_BY_ID[chosen[0]!]!.name}` : chosen.length ? `Adaptive · ${chosen.length} skills` : "Adaptive Practice";
    const sessionId = await createPracticeSession(userId, { mode: "smart", skillIds: chosen.length ? chosen : undefined, count: length, timing }, named);
    redirect(`/practice?session=${sessionId}${blockQuery}`);
  }
  const title = mode === "review" ? (skillId ? `Review · ${SKILL_BY_ID[skillId]!.name}` : "Review") : skillId ? SKILL_BY_ID[skillId]!.name : "Adaptive Practice";
  const sessionId=await createPracticeSession(userId, {mode,skillId,difficulty:plain},title);
  redirect(`/practice?session=${sessionId}${blockQuery}`);
}

export default async function PracticePage(props:PageProps<"/practice">) {
  let content, message:string|undefined;
  try { content=await loadPage(props); }
  catch(e) { if(e instanceof DeliveryBlocked) message=e.message; else throw e; }
  return message ? <DeliveryBlockedView message={message} /> : content;
}
