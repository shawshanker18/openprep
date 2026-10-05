import fs from 'node:fs';
import path from 'node:path';
import {beforeAll,expect,it,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {drizzle} from 'drizzle-orm/pglite';
import {eq} from 'drizzle-orm';
import * as schema from '@/db/schema';
import type {Tx} from '@/db';
import type {DeliveryContext} from './delivery-context';
import {SKILLS} from '@/content/taxonomy';
const pg=new PGlite(),db=drizzle(pg,{schema});
vi.mock('@/db',()=>({db}));
const D=await import('./delivery');
const {DELIVERY_POLICY:P}=await import('./delivery-policy');
const {databaseLimit}=await import('./ratelimit');
const {cleanDeliveryWindows}=await import('./delivery-maintenance');
let serial=100;
async function user(){ const id=`00000000-0000-0000-0000-${String(++serial).padStart(12,'0')}`; await db.insert(schema.profiles).values({id});return id; }
const qs=Array.from({length:700},(_,i)=>({id:`quota-${i}`,skillId:SKILLS[i%SKILLS.length]!.id}));
const empty:DeliveryContext={ip:null,device:null};
beforeAll(async()=>{
 const dir=path.resolve(import.meta.dirname,'../../drizzle');
 for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.sql')&&!x.startsWith('0001')).sort())
  for(const stmt of fs.readFileSync(path.join(dir,file),'utf8').split('--> statement-breakpoint')) await pg.exec(stmt);
 await db.insert(schema.questions).values(qs.map(q=>({...q,section:'math',domain:'m-alg',difficulty:1,type:'spr',stemMd:'s',answer:{accepted:['1']},explanationMd:'e'})));
});
const expose=(u:string,items:typeof qs,context=empty)=>db.transaction(tx=>D.exposeQuestions(tx as unknown as Tx,u,items,context));
const history=(u:string,n:number,ageMs:number,context=empty,oneSkill=false)=>db.insert(schema.questionExposures).values(qs.slice(0,n).map(q=>({userId:u,questionId:q.id,skillId:oneSkill?qs[0]!.skillId:q.skillId,firstAt:new Date(Date.now()-ageMs),ipHash:context.ip,deviceHash:context.device})));
it('atomically enforces the last daily slot across parallel deliveries and does not double-charge repeats',async()=>{
 const u=await user();await history(u,P.account.day-1,60_000);
 const outcomes=await Promise.allSettled(qs.slice(P.account.day-1,P.account.day+4).map(q=>expose(u,[q])));
 expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 expect(await db.select().from(schema.questionExposures).where(eq(schema.questionExposures.userId,u))).toHaveLength(P.account.day);
 await expect(expose(u,[qs[0]!])).resolves.toBeUndefined();
});
it('weekly account limits still hold when the daily counter is empty',async()=>{
 const u=await user();await history(u,P.account.week,2*86_400_000);
 await expect(expose(u,[qs[650]!])).rejects.toThrow(/limited/);
});
it('skill quotas cannot be bypassed by choosing another paper or filter',async()=>{
 const u=await user();await history(u,P.skill.day,60_000,empty,true);
 await expect(expose(u,[{id:qs[650]!.id,skillId:qs[0]!.skillId}])).rejects.toThrow(/limited/);
});
it('a shared device counts multiple accounts and rejected deliveries write nothing',async()=>{
 const context={ip:null,device:'signed-device-hash'};
 const a=await user(),b=await user(),c=await user();
 await history(a,180,60_000,context);await history(b,180,60_000,context);
 await expect(expose(c,[qs[500]!],context)).rejects.toThrow(/limited/);
 expect(await db.select().from(schema.questionExposures).where(eq(schema.questionExposures.userId,c))).toHaveLength(0);
});
it('shared IP quotas also count across devices and accounts',async()=>{
 const context={ip:'trusted-ip-hash',device:null};
 for(let i=0;i<10;i++) await history(await user(),180,60_000,context);
 await expect(expose(await user(),[qs[500]!],context)).rejects.toThrow(/limited/);
});
it('set and similarity quotas persist without Redis; paper nonces have bounded uses',async()=>{
 const u=await user();
 for(let i=0;i<P.similarPerDay;i++) await D.eventQuota(u,empty,'similar');
 await expect(D.eventQuota(u,empty,'similar')).rejects.toThrow(/limited/);
 for(let i=0;i<2;i++) await db.transaction(tx=>D.consumeWindow(tx as unknown as Tx,`paper:${u}:nonce`,2,3600_000));
 await expect(db.transaction(tx=>D.consumeWindow(tx as unknown as Tx,`paper:${u}:nonce`,2,3600_000))).rejects.toThrow();
});
it('the database enforces the extra answer bucket and a rolling request window',async()=>{
 const u=await user();
 const results=await Promise.all(Array.from({length:8},()=>databaseLimit(u,'answer','question')));
 expect(results.filter(r=>r===null)).toHaveLength(3);
 vi.spyOn(Date,'now').mockReturnValue(1_700_000_009_000);
 const other=await user();for(let i=0;i<10;i++) expect(await databaseLimit(other)).toBeNull();
 vi.spyOn(Date,'now').mockReturnValue(1_700_000_010_001);
 expect(await databaseLimit(other)).not.toBeNull();
 vi.restoreAllMocks();
});
it('retired questions cannot be freshly exposed even from an already assembled test',async()=>{
 await db.update(schema.questions).set({status:'retired'}).where(eq(schema.questions.id,qs[699]!.id));
 await expect(expose(await user(),[qs[699]!])).rejects.toThrow(/updated/);
});
it('client roles have no access to the question bank or private quota ledgers',async()=>{
 await pg.exec('create role anon;create role authenticated');
 // Re-run only security clauses after roles exist, as on a Supabase project.
 const migration=fs.readFileSync(path.resolve(import.meta.dirname,'../../drizzle/0013_private_question_delivery.sql'),'utf8');
 for(const stmt of migration.split('--> statement-breakpoint').filter(s=>s.includes('REVOKE ALL'))) await pg.exec(stmt);
 for(const role of ['anon','authenticated']) {
  await pg.exec(`set role ${role}`);
  for(const table of ['questions','question_exposures','delivery_windows','delivery_guards'])
   await expect(pg.query(`select * from ${table}`)).rejects.toThrow(/permission denied/);
  await pg.exec('reset role');
 }
});
it('cleanup expires buckets and removes old IP/device hashes while preserving exposure history',async()=>{
 const u=await user();await history(u,1,40*86_400_000,{ip:'old-ip',device:'old-device'});
 await db.insert(schema.deliveryWindows).values({id:'expired',times:[],expiresAt:new Date(0)});
 await cleanDeliveryWindows();
 expect(await db.select().from(schema.deliveryWindows).where(eq(schema.deliveryWindows.id,'expired'))).toHaveLength(0);
 const [row]=await db.select().from(schema.questionExposures).where(eq(schema.questionExposures.userId,u));
 expect(row).toMatchObject({ipHash:null,deviceHash:null,questionId:qs[0]!.id});
});
