import fs from 'node:fs';
import path from 'node:path';
import {beforeAll,expect,it,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {drizzle} from 'drizzle-orm/pglite';
import {eq} from 'drizzle-orm';
import * as schema from '@/db/schema';
const pg=new PGlite(),db=drizzle(pg,{schema});
const state=vi.hoisted(()=>({user:null as string|null}));
vi.mock('@/db',()=>({db}));
vi.mock('./delivery-context',()=>({deliveryContext:async()=>({ip:null,device:null})}));
vi.mock('./auth',()=>({requireUser:async()=>{
 if(!state.user) throw new Error('Authentication required');
 return {userId:state.user,profile:await db.query.profiles.findFirst({where:eq(schema.profiles.id,state.user)})};
}}));
const A=await import('@/app/(app)/practice/actions');
const {createPaper}=await import('./papers');
const {publicId}=await import('./questions');
const USER='00000000-0000-0000-0000-000000000011',OTHER='00000000-0000-0000-0000-000000000022';
const ID='access-question',SKILL='m-alg-lin1';
beforeAll(async()=>{
 const dir=path.resolve(import.meta.dirname,'../../drizzle');
 for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.sql')&&!x.startsWith('0001')).sort())
  for(const stmt of fs.readFileSync(path.join(dir,file),'utf8').split('--> statement-breakpoint')) await pg.exec(stmt);
 await db.insert(schema.profiles).values([{id:USER},{id:OTHER}]);
 await db.insert(schema.skillState).values([{userId:USER,skillId:SKILL},{userId:OTHER,skillId:SKILL}]);
 await db.insert(schema.questions).values({id:ID,skillId:SKILL,section:'math',domain:'m-alg',difficulty:1,type:'spr',stemMd:'Solve x=1.',answer:{accepted:['1']},explanationMd:'x is 1.'});
});
it('all question actions reject missing authentication before processing input',async()=>{
 state.user=null;
 await expect(A.nextQuestion({paperId:'fake',exclude:[]})).rejects.toThrow(/Authentication/);
 await expect(A.submitAnswer({questionId:'fake',response:null,timeMs:0,confidence:1})).rejects.toThrow(/Authentication/);
 await expect(A.toggleBookmark({questionId:'fake'})).rejects.toThrow(/Authentication/);
 await expect(A.reportQuestion({questionId:'fake',reason:'typo'})).rejects.toThrow(/Authentication/);
 expect(await db.select().from(schema.questionExposures)).toHaveLength(0);
});
it('a valid ID cannot save or reveal an unserved question, including on another account',async()=>{
 state.user=USER;
 const id=publicId(ID,USER);
 expect((await A.toggleBookmark({questionId:id})).ok).toBe(false);
 const paper=await createPaper(USER,{mode:'skill',skillId:SKILL});
 const served=await A.nextQuestion({paperId:paper,exclude:[]});expect(served.ok).toBe(true);
 expect((await A.toggleBookmark({questionId:id})).ok).toBe(true);
 expect((await A.nextQuestion({paperId:paper,exclude:[],similarTo:id})).ok).toBe(false);
 state.user=OTHER;
 expect((await A.nextQuestion({paperId:paper,exclude:[]})).ok).toBe(false);
 expect((await A.toggleBookmark({questionId:id})).ok).toBe(false);
 expect((await A.toggleBookmark({questionId:publicId(ID,OTHER)})).ok).toBe(false);
 expect((await A.submitAnswer({questionId:id,response:'1',timeMs:999999,confidence:1})).ok).toBe(false);
});
it('a reusable paper cannot pull more than its server-side set size',async()=>{
 state.user=USER;
 await db.update(schema.questionServes).set({servedAt:new Date(Date.now()-6000)});
 expect((await A.submitAnswer({questionId:publicId(ID,USER),response:'1',timeMs:5000,confidence:2})).ok).toBe(true);
 const paper=await createPaper(USER,{mode:'skill',skillId:SKILL,count:1});
 expect((await A.nextQuestion({paperId:paper,exclude:[]})).ok).toBe(true);
 await db.update(schema.questionServes).set({servedAt:new Date(Date.now()-6000)});
 expect((await A.submitAnswer({questionId:publicId(ID,USER),response:'1',timeMs:5000,confidence:2})).ok).toBe(true);
 expect((await A.nextQuestion({paperId:paper,exclude:[]})).ok).toBe(false);
});
