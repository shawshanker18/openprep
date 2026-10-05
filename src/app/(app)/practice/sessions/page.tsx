import Link from "next/link";
import { requireUser } from "@/server/auth";
import { listPracticeSessions } from "@/server/practice-sessions";
import { Button } from "@/components/ui/button";
export const metadata = {title:"Saved practice sessions"};
export default async function SavedPracticePage({searchParams}:PageProps<"/practice/sessions">) {
  const {userId,profile}=await requireUser();
  const sp=await searchParams;
  const n=Number(sp.page);
  const page=Number.isSafeInteger(n) && n>=1 && n<=10000?n:1;
  const sessions=await listPracticeSessions(userId,page);
  return <div className="flex flex-col gap-5">
    <h1 className="text-2xl font-semibold">Saved practice sessions</h1>
    <p className="text-sm text-muted-foreground">Your questions, submitted answers and unfinished work are saved to your account.</p>
    <Button className="self-start" render={<Link href="/practice" />}>New practice session</Button>
    {!sessions.length && <p>No saved sessions yet. Start practicing to create one.</p>}
    {sessions.map(s=><div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-4">
      <div><h2 className="font-medium">{s.title}</h2><p className="text-sm text-muted-foreground">{s.status==="completed"?"Completed":"In progress"} · Last saved {s.updatedAt.toLocaleString("en-GB",{timeZone:profile.timezone})}</p></div>
      <Button variant="outline" render={<Link href={`/practice?session=${s.id}`} />}>{s.status==="completed"?"Review":"Resume"}</Button>
    </div>)}
    <div className="flex gap-3 text-sm">
      {page>1 && <Link className="underline" href={`/practice/sessions?page=${page-1}`}>Newer sessions</Link>}
      {sessions.length===50 && <Link className="underline" href={`/practice/sessions?page=${page+1}`}>Older sessions</Link>}
    </div>
  </div>;
}
