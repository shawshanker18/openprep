"use client";
import { useState } from 'react';
import Link from 'next/link';
import { DOMAINS, SKILLS, type Section } from '@/content/taxonomy';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/markdown';
import type { PublicQuestion } from '@/server/questions';

export function QuestionBankPicker({initialSkills = [], initialDifficulty = 'mixed', previews = []}: {
  initialSkills?: string[]; initialDifficulty?: string; previews?: PublicQuestion[];
}) {
  const [section, setSection] = useState<Section>(initialSkills[0]?.startsWith('rw-') ? 'rw' : 'math');
  const [selected, setSelected] = useState(initialSkills);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [count, setCount] = useState('10');
  const skills = SKILLS.filter(s => s.section === section);
  const toggle = (id: string) => setSelected(old => old.includes(id) ? old.filter(s => s !== id) : [...old, id]);
  const query = new URLSearchParams({mode:'set', from:'/question-bank', skills:selected.join(','), difficulty, count, timing:'off'});
  return <div className="flex flex-col gap-6">
    <form action="/question-bank" className="flex flex-col gap-5 rounded-xl border p-5">
      <fieldset><legend className="mb-2 text-sm font-medium">Subject</legend><div className="flex gap-4">{(['math','rw'] as const).map(s => <label key={s} className="flex items-center gap-2"><input type="radio" checked={section===s} onChange={() => {setSection(s);setSelected([]);}} />{s==='math'?'Math':'Reading and Writing'}</label>)}</div></fieldset>
      <div><div className="mb-2 flex flex-wrap items-center gap-3"><h2 className="font-medium">Skills · {selected.length} selected</h2><button type="button" className="text-sm underline" onClick={() => setSelected(skills.map(s=>s.id))}>Select all</button><button type="button" className="text-sm underline" onClick={() => setSelected([])}>Clear</button></div>
      <div className="grid gap-2 sm:grid-cols-2">{Object.entries(DOMAINS).filter(([,d]) => d.section===section).map(([id, domain]) => <details key={id} className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">{domain.name} · {selected.filter(s=>SKILLS.find(k=>k.id===s)?.domain===id).length} selected</summary><div className="mt-3 flex flex-col gap-2">{skills.filter(s=>s.domain===id).map(s=><label key={s.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={selected.includes(s.id)} onChange={()=>toggle(s.id)} className="mt-1" />{s.name}</label>)}</div></details>)}</div></div>
      <input type="hidden" name="skills" value={selected.join(',')} />
      <div className="flex flex-wrap gap-6"><label className="flex flex-col gap-2 text-sm">SAT difficulty<select name="difficulty" value={difficulty} onChange={e=>setDifficulty(e.target.value)} className="rounded-md border bg-background p-2"><option value="mixed">Mixed</option><option value="1">Easy (SAT)</option><option value="2">Medium (SAT)</option><option value="3">Hard (SAT)</option></select></label><label className="flex flex-col gap-2 text-sm">Questions<select value={count} onChange={e=>setCount(e.target.value)} className="rounded-md border bg-background p-2">{[10,20,30].map(n=><option key={n}>{n}</option>)}</select></label></div>
      <p className="text-xs text-muted-foreground">Difficulty describes SAT questions. Questions in active practice sessions or tests are excluded.</p>
      <div className="flex flex-wrap gap-3">{selected.length ? <Button render={<Link href={`/practice?${query}`} prefetch={false} />}>Start practice</Button> : <Button disabled>Start practice</Button>}<Button type="submit" name="preview" value="1" variant="outline" disabled={!selected.length}>View questions</Button></div>
    </form>
    {previews.length>0 && <section className="flex flex-col gap-3"><h2 className="text-lg font-medium">Question previews</h2>{previews.map((q,i)=><details key={q.id} className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">Question {i+1} · {SKILLS.find(s=>s.id===q.skillId)?.name} · {q.difficulty===1?'Easy':q.difficulty===2?'Medium':'Hard'} (SAT)</summary><div className="mt-4 flex flex-col gap-4">{q.passageMd && <Markdown>{q.passageMd}</Markdown>}<Markdown>{q.stemMd}</Markdown>{q.choices?.map(c=><div key={c.id} className="flex gap-3 rounded-md border p-3"><b>{c.id}</b><Markdown>{c.md}</Markdown></div>)}<Button className="self-start" render={<Link prefetch={false} href={`/practice?mode=list&ids=${q.id}&from=/question-bank`} />}>Attempt this question</Button></div></details>)}</section>}
  </div>;
}
