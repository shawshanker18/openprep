import {requireAdmin} from '@/server/admin';
import {exposureOverview} from '@/server/delivery-maintenance';
import {retireQuestion} from './actions';
import {Button} from '@/components/ui/button';

export default async function ExposurePage() {
  await requireAdmin();
  const {questions,shared}=await exposureOverview();
  return <div className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Question exposure</h1>
    <p className="text-sm text-muted-foreground">Review high exposure and accounts sharing a device or network. Shared school networks alone do not prove abuse.</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Question</th><th>State</th><th>Accounts</th><th>Today</th><th>Action</th></tr></thead>
      <tbody>{(questions as unknown as {question_id:string;status:string;accounts:number;today:number}[]).map(q=><tr key={q.question_id} className="border-b"><td className="p-2">{q.question_id}</td><td>{q.status}</td><td>{q.accounts}</td><td>{q.today}</td><td>{q.status==='active'&&<form action={retireQuestion} className="flex gap-2"><input type="hidden" name="id" value={q.question_id}/><input name="reason" aria-label="Retirement reason" placeholder="Reason" minLength={5} maxLength={500} required className="rounded border px-2"/><Button type="submit" variant="outline">Retire</Button></form>}</td></tr>)}</tbody></table></div>
    <h2 className="text-lg font-semibold">Shared access in the last week</h2>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Scope</th><th>Private reference</th><th>Accounts</th><th>New questions</th></tr></thead><tbody>{(shared as unknown as {scope:string;subject:string;accounts:number;questions:number}[]).map(s=><tr key={`${s.scope}:${s.subject}`} className="border-b"><td>{s.scope}</td><td className="p-2 font-mono">{s.subject.slice(0,12)}</td><td>{s.accounts}</td><td>{s.questions}</td></tr>)}</tbody></table></div>
  </div>;
}
