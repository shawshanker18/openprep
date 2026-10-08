"use client";
import { useState } from 'react';
import Link from 'next/link';
import { DOMAINS, SKILLS, type Section } from '@/content/taxonomy';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/markdown';
import type { PublicQuestion } from '@/server/questions';

export function QuestionBankPicker({initialSkills = [], initialDifficulties = [1,2,3], initialCount = '10', previews = []}: {
  initialSkills?: string[]; initialDifficulties?: number[]; initialCount?: string; previews?: PublicQuestion[];
}) {
  const [section, setSection] = useState<Section>(initialSkills[0]?.startsWith('rw-') ? 'rw' : 'math');
  const [selected, setSelected] = useState(initialSkills);
  const [difficulties, setDifficulties] = useState(initialDifficulties);
  const [count, setCount] = useState(initialCount);
  const skills = SKILLS.filter(s => s.section === section);
  const toggle = (id: string) => setSelected(old => old.includes(id) ? old.filter(s => s !== id) : [...old, id]);
  const query = new URLSearchParams({mode:'set', from:'/question-bank', skills:selected.join(','), difficulties:difficulties.join(','), count, timing:'off'});
  return <div className="flex flex-col gap-6">
    <form action="/question-bank" className="flex flex-col gap-5 rounded-xl border p-5">
      <fieldset><legend className="mb-2 text-sm font-medium">Subject</legend><div className="flex flex-wrap gap-4">{(['math','rw'] as const).map(s => <label key={s} className="flex items-center gap-2"><input type="radio" checked={section===s} onChange={() => {setSection(s);setSelected([]);}} />{s==='math'?'Math':'Reading and Writing'}</label>)}</div></fieldset>
      <div><div className="mb-2 flex flex-wrap items-center gap-3"><h2 className="font-medium">Topics and skills · {selected.length} selected</h2><button type="button" className="text-sm underline" onClick={() => setSelected(skills.map(s=>s.id))}>Select all</button><button type="button" className="text-sm underline" onClick={() => setSelected([])}>Clear</button></div>
      <div className="grid gap-2 sm:grid-cols-2">{Object.entries(DOMAINS).filter(([,d]) => d.section===section).map(([id, domain]) => <details key={id} className="dark min-w-0 rounded-lg border bg-background p-3 text-foreground"><summary className="cursor-pointer text-sm font-medium">{domain.name} · {selected.filter(s=>SKILLS.find(k=>k.id===s)?.domain===id).length} selected</summary><div className="mt-3 flex flex-col gap-2"><label className="mb-2 flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={skills.filter(s=>s.domain===id).every(s=>selected.includes(s.id))} onChange={e=>{const group=skills.filter(s=>s.domain===id).map(s=>s.id);setSelected(old=>e.target.checked?[...new Set([...old,...group])]:old.filter(s=>!group.includes(s)));}} />Select all {domain.name} skills</label>{skills.filter(s=>s.domain===id).map(s=><label key={s.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={selected.includes(s.id)} onChange={()=>toggle(s.id)} className="mt-1" />{s.name}</label>)}</div></details>)}</div></div>
      <input type="hidden" name="skills" value={selected.join(',')} />
      <div className="flex flex-wrap gap-6"><fieldset><legend className="mb-2 text-sm font-medium">SAT difficulty · choose one or more</legend><div className="flex flex-wrap gap-4">{[1,2,3].map(d=><label key={d} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={difficulties.includes(d)} onChange={()=>setDifficulties(old=>old.includes(d)?old.filter(v=>v!==d):[...old,d].sort())} />{d===1?'Easy':d===2?'Medium':'Hard'} (SAT)</label>)}</div><div className="mt-2 flex gap-3 text-xs"><button type="button" className="underline" onClick={()=>setDifficulties([1,2,3])}>Select all difficulties</button><button type="button" className="underline" onClick={()=>setDifficulties([])}>Clear difficulties</button></div><input type="hidden" name="difficulties" value={difficulties.join(',')} /></fieldset><label className="flex flex-col gap-2 text-sm">Questions<select name="count" value={count} onChange={e=>setCount(e.target.value)} className="rounded-md border bg-background p-2">{[10,20,30].map(n=><option key={n}>{n}</option>)}</select></label></div>
      <p className="text-xs text-muted-foreground">Difficulty describes SAT questions. Questions in active practice sessions or tests are excluded.</p>
      <div className="flex flex-wrap gap-3">{selected.length && difficulties.length ? <Button render={<Link href={`/practice?${query}`} prefetch={false} />}>Start practice</Button> : <Button disabled>Start practice</Button>}<Button type="submit" name="preview" value="1" variant="outline" disabled={!selected.length || !difficulties.length}>View questions</Button></div>
    </form>
    {previews.length>0 && <section className="flex flex-col gap-3"><h2 className="text-lg font-medium">Question previews</h2>{previews.map((q,i)=><details key={q.id} className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">Question {i+1} · {SKILLS.find(s=>s.id===q.skillId)?.name} · {q.difficulty===1?'Easy':q.difficulty===2?'Medium':'Hard'} (SAT)</summary><div className="mt-4 flex flex-col gap-4">{q.passageMd && <Markdown>{q.passageMd}</Markdown>}<Markdown>{q.stemMd}</Markdown>{q.choices?.map(c=><div key={c.id} className="flex min-w-0 gap-3 rounded-md border p-3"><b>{c.id}</b><Markdown className="min-w-0 flex-1">{c.md}</Markdown></div>)}<Button className="self-start" render={<Link prefetch={false} href={`/practice?mode=list&ids=${q.id}&from=/question-bank`} />}>Attempt this question</Button></div></details>)}</section>}
  </div>;
}
