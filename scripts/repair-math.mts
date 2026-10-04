import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import {normalizeQuestionMarkdown} from '../src/lib/question-markdown';
const dir=process.argv[2],apply=process.argv.includes('--apply');
if(!dir)throw new Error('Audit output directory required');
const db=postgres(process.env.DATABASE_URL!,{prepare:false,max:1});
const rows=await db`select id,stem_md,passage_md,choices from public.questions where status='active'`;
const changes=rows.map(q=>({...q,stem_md:normalizeQuestionMarkdown(q.stem_md),passage_md:q.passage_md?normalizeQuestionMarkdown(q.passage_md):null,choices:q.choices?.map((c:{id:string;md:string})=>({...c,md:normalizeQuestionMarkdown(c.md)}))??null})).filter((q,i)=>JSON.stringify(q)!==JSON.stringify(rows[i]));
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'math-repair-plan.json'),JSON.stringify(changes));
const backup=path.join(dir,'questions-before-math-repair.json');
if(!fs.existsSync(backup))fs.writeFileSync(backup,JSON.stringify(rows));
console.log(`Presentation fixes planned for ${changes.length} questions.`);
if(apply)await db.begin(async tx=>{
  for(let i=0;i<changes.length;i+=500)await tx`update public.questions q set stem_md=u.stem_md,passage_md=u.passage_md,choices=u.choices from jsonb_to_recordset(${tx.json(changes.slice(i,i+500))}) as u(id text,stem_md text,passage_md text,choices jsonb) where q.id=u.id`;
});
await db.end();
