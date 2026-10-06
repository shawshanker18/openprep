import Link from 'next/link';
import { QuestionBankPicker } from '@/components/question-bank-picker';
import { requireUser } from '@/server/auth';
import { SKILL_BY_ID } from '@/content/taxonomy';
import { previewQuestions } from '@/server/bank-preview';
import { DeliveryBlocked } from '@/server/delivery-policy';
export const metadata = {title:'Question Bank'};
export default async function QuestionBankPage({searchParams}: PageProps<'/question-bank'>) {
  const {userId} = await requireUser();
  const sp = await searchParams;
  const skills = [...new Set((typeof sp.skills==='string'?sp.skills:'').split(',').filter(s=>SKILL_BY_ID[s]))].slice(0,29);
  const selected = (typeof sp.difficulties==='string'?sp.difficulties:typeof sp.difficulty==='string'?sp.difficulty:'1,2,3').split(',').map(Number).filter(d=>[1,2,3].includes(d));
  const difficulties = selected.length ? [...new Set(selected)] : [1,2,3];
  const count = ['10','20','30'].includes(String(sp.count)) ? String(sp.count) : '10';
  let previews: Awaited<ReturnType<typeof previewQuestions>> = [], message;
  if (sp.preview==='1' && skills.length) {
    try {previews=await previewQuestions(userId,skills,difficulties);}
    catch(e) {if(e instanceof DeliveryBlocked) message=e.message;else throw e;}
  }
  return <div className="flex flex-col gap-6"><header><h1 className="text-2xl font-semibold">Question Bank</h1><p className="mt-2 text-muted-foreground">Choose what you want to practice. Preview a question or start a set.</p></header>
    {message && <p role="alert">{message}</p>}
    <QuestionBankPicker key={`${skills.join(',')}:${difficulties.join(',')}:${count}`} initialSkills={skills} initialDifficulties={difficulties} initialCount={count} previews={previews} />
    {sp.preview==='1' && !previews.length && !message && <p>No available questions match these filters. Try other skills or a mixed difficulty.</p>}
    <div className="flex gap-4 text-sm"><Link className="underline" href="/practice">Recommended practice</Link><Link className="underline" href="/bookmarks">Saved questions</Link></div>
  </div>;
}
