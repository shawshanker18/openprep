// Explicit opt-in, read-only audit of the live bank. Normal CI does not need database credentials.
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import postgres from 'postgres';
import {expect,it,vi} from 'vitest';
import {Markdown} from '../src/components/markdown';
import {grade,isValidSprInput} from '../src/engine/grade';
import {SKILL_BY_ID} from '../src/content/taxonomy';
import type {Question} from '../src/db/schema';
const output=process.env.OPENPREP_LIVE_AUDIT_OUTPUT;
it.skipIf(!output)('renders and checks grading contracts for every active question',async()=>{
  vi.stubGlobal('React',React);
  const db=postgres(process.env.DATABASE_URL!,{prepare:false,max:1});
  const failures:{id:string;issue:string}[]=[],mathWarnings:{id:string;field:string;detail?:string}[]=[];
  try {
    const rows=await db`select * from public.questions where status='active' order by id`;
    let checked=0;
    for(const q of rows){
      if(!SKILL_BY_ID[q.skill_id] || SKILL_BY_ID[q.skill_id]!.domain!==q.domain) failures.push({id:q.id,issue:'taxonomy mismatch'});
      const answer=q.answer as Question['answer'];
      const response='choice' in answer?answer.choice:answer.accepted[0]!;
      if(!grade({answer},response)) failures.push({id:q.id,issue:'correct stored answer cannot be graded'});
      if('accepted' in answer && !answer.accepted.some(isValidSprInput)) failures.push({id:q.id,issue:'answer cannot fit numeric input'});
      if(q.type==='mcq' && (!Array.isArray(q.choices) || !q.choices.some((c:{id:string})=>c.id===response))) failures.push({id:q.id,issue:'correct choice missing'});
      const fields:[string,string][]=[['stem',q.stem_md],['passage',q.passage_md??''],...(q.choices??[]).map((c:{id:string;md:string})=>[`choice ${c.id}`,c.md])];
      for(const [field,md] of fields){
        try {
          const html=renderToStaticMarkup(React.createElement(Markdown,null,md.replace(/asset:\/\/[^)\s]+/g,'/api/question-assets/opaque/0')));
          if(html.includes('katex-error')) mathWarnings.push({id:q.id,field,detail:html.match(/title="([^"]*KaTeX[^\"]*)"/)?.[1]});
          if(html.includes('[object Object]')) failures.push({id:q.id,issue:`unconverted ${field} object`});
        } catch {failures.push({id:q.id,issue:`${field} rendering threw`});}
      }
      checked++;
      if(checked%3000===0) console.log(`Rendered ${checked} active questions`);
    }
    fs.writeFileSync(output!,JSON.stringify({checked:rows.length,failures,mathWarnings,scope:'read-only server rendering and grading contract; not browser or editorial correctness'},null,2));
    expect(failures.length).toBe(0);
  } finally {await db.end();vi.unstubAllGlobals();}
},180000);
