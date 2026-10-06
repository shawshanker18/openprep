import Link from "next/link";
import { Button } from "@/components/ui/button";
import {DeliveryBlockedView} from "@/components/delivery-blocked";
import { DeliveryBlocked } from "@/server/delivery-policy";
import { notFound, redirect } from "next/navigation";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { getTodayBlock } from "@/server/daily";
import { requireUser } from "@/server/auth";
import { createPracticeSession, getPracticeSession, listPracticeSessions } from "@/server/practice-sessions";
import { z } from "zod";
import { PracticeRunner } from "./practice-runner";

export const metadata = { title: "Practice" };

const list = (v: string | string[] | undefined) => [v ?? []].flat().flatMap((x) => x.split(",")).filter(Boolean);

async function loadPage({ searchParams }: PageProps<"/practice">) {
  const sp = await searchParams;
  const { userId, profile } = await requireUser();
  if (Object.keys(sp).length === 0) {
    const saved = (await listPracticeSessions(userId)).find(s => s.status === 'active');
    return <div className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Practice</h1>
      {saved && <section className="rounded-xl border p-5"><h2 className="font-medium">Continue practicing</h2><p className="mb-3 text-sm">{saved.title}</p><Button render={<Link href={`/practice?session=${saved.id}`} />}>Resume session</Button></section>}
      <section className="rounded-xl border p-5"><h2 className="font-medium">Recommended Practice</h2><p className="my-3 text-sm text-muted-foreground">Questions chosen from your recent answers and skills that need work.</p><Button render={<Link prefetch={false} href="/practice?recommended=1" />}>Start recommended practice</Button></section>
      <section><h2 className="font-medium">Choose your own practice</h2><p className="my-2 text-sm text-muted-foreground">Select skills, difficulty and length in the Question Bank.</p><Link className="underline" href="/question-bank">Open Question Bank</Link></section>
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
    return <PracticeRunner key={session.id} userId={userId} sessionId={session.id} mode={session.config.mode}
      title={session.title} block={block} set={{count:session.config.count??100}} back={session.back??undefined} />;
  }
  const skillId = typeof sp.skill === "string" ? sp.skill : undefined;
  const d = sp.difficulty === "mixed" ? "mixed" : Number(sp.difficulty);
  const difficulty = d === 1 || d === 2 || d === 3 || d === "mixed" ? d : undefined;
  if (skillId && !SKILL_BY_ID[skillId]) notFound();
  const mode = sp.mode === "review" ? "review" : sp.mode === "set" ? "set" : sp.mode === "list" ? "list" : skillId ? "skill" : "smart";

  // Where to go when the set is finished: the course or the question bank (only these paths are accepted).
  const back = typeof sp.from === "string" && /^\/(start(\/[a-z-]+)?|course(\/[a-z-]+)?|question-bank(\?[\w=&%.,-]*)?|bookmarks(\?page=\d+)?)$/.test(sp.from) ? sp.from : undefined;

  if (mode === "list") {
    const ids = list(sp.ids).filter((id) => /^[\w-]{22}$/.test(id)).slice(0, 50);
    const sessionId=await createPracticeSession(userId, {mode:"list",ids,count:Math.max(1,ids.length)},back?.startsWith('/bookmarks')?'Saved questions':'Question bank',back);
    redirect(`/practice?session=${sessionId}${blockQuery}`);
  }

  if (mode === "set") {
    const skillIds = list(sp.skills).filter((s) => SKILL_BY_ID[s]).slice(0, 29);
    if (list(sp.skills).length !== skillIds.length) notFound();
    const tags = list(sp.tags);
    if (tags.length > 1 || tags.some(tag => tag !== "desmos")) notFound();
    const n = Number(sp.count);
    const count = sp.count === undefined ? 10 : n;
    if (![5, 10, 20, 30].includes(count)) notFound();
    const timing = sp.timing === "on" || sp.timing === "off" ? sp.timing : "auto";
    if (!back && !skillIds.length) notFound();
    const title = skillIds.length === 1 ? SKILL_BY_ID[skillIds[0]!]!.name : "Question bank";
    const set = { skillIds, tags, count, timing } as const;
    const sessionId=await createPracticeSession(userId, {mode:"set", difficulty, ...set},title,back);
    redirect(`/practice?session=${sessionId}${blockQuery}`);
  }

  const plain = difficulty === "mixed" ? undefined : difficulty;
  const title = mode === "review" ? (skillId ? `Review · ${SKILL_BY_ID[skillId]!.name}` : "Review") : skillId ? SKILL_BY_ID[skillId]!.name : "Recommended practice";
  const sessionId=await createPracticeSession(userId, {mode,skillId,difficulty:plain},title);
  redirect(`/practice?session=${sessionId}${blockQuery}`);
}

export default async function PracticePage(props:PageProps<"/practice">) {
  let content, message:string|undefined;
  try { content=await loadPage(props); }
  catch(e) { if(e instanceof DeliveryBlocked) message=e.message; else throw e; }
  return message ? <DeliveryBlockedView message={message} /> : content;
}
