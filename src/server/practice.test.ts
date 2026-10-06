import fs from 'node:fs';
import path from 'node:path';
import {beforeAll,expect,it,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {drizzle} from 'drizzle-orm/pglite';
import {and,eq} from 'drizzle-orm';
import * as schema from '@/db/schema';
import {SKILLS} from '@/content/taxonomy';
vi.mock('./delivery-context',()=>({deliveryContext:async()=>({ip:null,device:null})}));
const pg=new PGlite(),db=drizzle(pg,{schema});
vi.mock('@/db',()=>({db}));
const P=await import('./practice'),Q=await import('./questions');
const USER='00000000-0000-0000-0000-0000000000cc',OTHER='00000000-0000-0000-0000-0000000000dd';
const skill=SKILLS.find(s=>s.section==='math')!;
const ids=['qa','qb','qc','qd'].map(x=>`${skill.id}-${x}`);
beforeAll(async()=>{
 const dir=path.resolve(import.meta.dirname,'../../drizzle');
 for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.sql')&&!x.startsWith('0001')).sort())
  for(const stmt of fs.readFileSync(path.join(dir,file),'utf8').split('--> statement-breakpoint')) await pg.exec(stmt);
 await db.insert(schema.profiles).values([{id:USER},{id:OTHER}]);
 await db.insert(schema.skillState).values([USER,OTHER].flatMap(userId=>SKILLS.map(s=>({userId,skillId:s.id}))));
 await db.insert(schema.questions).values(ids.map(id=>({id,skillId:skill.id,section:skill.section,domain:skill.domain,difficulty:2,type:'mcq' as const,stemMd:'stem',choices:[{id:'A',md:'1'}],answer:{choice:'A'},explanationMd:'explanation'})));
});
const serve=(user:string,id:string)=>P.nextQuestion(user,{} as schema.Profile,{mode:'list',ids:[id],exclude:[]});
const age=()=>db.update(schema.questionServes).set({servedAt:new Date(Date.now()-6000)});
it('IDs differ between accounts and resolve only delivered content',async()=>{
 const pub=Q.publicId(ids[0]!,USER);
 expect(pub).not.toBe(Q.publicId(ids[0]!,OTHER));
 expect(await Q.internalId(pub,USER)).toBeNull();
 const r=await serve(USER,ids[0]!);
 expect(r!.question.id).toBe(pub);
 expect(await Q.internalId(pub,USER)).toBe(ids[0]);
 expect(await Q.internalId(pub,OTHER)).toBeNull();
 expect(await Q.internalId(ids[0]!,USER)).toBeNull();
 expect(JSON.stringify(r!.question)).not.toMatch(/explanation|choiceRationales/);
 expect(r!.question).toMatchObject({skillId:"m-alg-lin1",domain:"m-alg",difficulty:2});
});
it('an immediate wrong answer cannot reveal the solution; identical retries are idempotent',async()=>{
 const input={questionId:ids[0]!,response:'B',timeMs:5000,confidence:2 as const};
 await expect(P.submitAnswer(USER,input)).rejects.toThrow(/read the question/);
 await age();
 const first=await P.submitAnswer(USER,input),retry=await P.submitAnswer(USER,input);
 expect(first!.revealed.answer).toEqual({choice:'A'});
 expect(retry!.attemptId).toBe(first!.attemptId);
 expect(await P.submitAnswer(USER,{...input,response:'A'})).toBeNull();
 expect(await P.submitAnswer(OTHER,input)).toBeNull();
});
it('unfinished questions do not block fresh practice deliveries',async()=>{
 const results=await Promise.allSettled(ids.map(id=>serve(OTHER,id)));
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(4);
 expect(results.filter(r=>r.status==='rejected')).toHaveLength(0);
 expect(await db.select().from(schema.questionServes).where(eq(schema.questionServes.userId,OTHER))).toHaveLength(4);
});
it('reopening the same unfinished question reuses its delivery without resetting the answer clock',async()=>{
 const [before]=await db.select().from(schema.questionServes).where(and(eq(schema.questionServes.userId,OTHER),eq(schema.questionServes.questionId,ids[0]!)));
 const exposures=await db.select().from(schema.questionExposures).where(eq(schema.questionExposures.userId,OTHER));
 expect((await serve(OTHER,ids[0]!))!.question.id).toBe(Q.publicId(ids[0]!,OTHER));
 const [after]=await db.select().from(schema.questionServes).where(and(eq(schema.questionServes.userId,OTHER),eq(schema.questionServes.questionId,ids[0]!)));
 expect(after!.servedAt).toEqual(before!.servedAt);
 expect(await db.select().from(schema.questionExposures).where(eq(schema.questionExposures.userId,OTHER))).toHaveLength(exposures.length);
});
it('resuming preserves the server clock and consumes no new exposure',async()=>{
 const [served]=await db.select().from(schema.questionServes).where(eq(schema.questionServes.userId,OTHER));
 const old=served!.servedAt;
 const r=await P.resumeQuestion(OTHER,served!.questionId,'off');
 expect(r!.question.id).toBe(Q.publicId(served!.questionId,OTHER));
 const [after]=await db.select().from(schema.questionServes).where(and(eq(schema.questionServes.userId,OTHER),eq(schema.questionServes.questionId,served!.questionId)));
 expect(after!.servedAt).toEqual(old);
});
it('bank history has no unseen catalogue, totals or saved-before-serve preview',async()=>{
 await db.insert(schema.bookmarks).values({userId:USER,questionId:ids[3]!});
 const bank=await P.questionBank(USER);
 expect(bank.rows.map(r=>r.id)).toEqual([ids[0]]);
 expect(bank.counts).toEqual({attempted:1,correct:0,incorrect:1});
 expect(bank.counts).not.toHaveProperty('total');
 expect((await P.questionBank(USER,{status:'new',page:100})).rows).toEqual([]);
});

it("plan blocks are done only from real work today (a click can't tick them)", async () => {
  const D = await import("./daily");
  const U3 = "00000000-0000-0000-0000-0000000000ee";
  await db.insert(schema.profiles).values({ id: U3 });
  await db.insert(schema.skillState).values(SKILLS.map((s) => ({ userId: U3, skillId: s.id })));
  const profile = { timezone: "UTC" } as schema.Profile;
  const today = new Date().toISOString().slice(0, 10);
  const blocks = [
    { kind: "practice", minutes: 5, skillId: skill.id, done: true },  // a stored "done" is ignored
    { kind: "mini", minutes: 5, skillId: skill.id, done: false },     // same skill: must not reuse the same answers
    { kind: "review", minutes: 5, done: false },
    { kind: "learn", minutes: 10, skillId: skill.id, done: false },
    { kind: "desmos", minutes: 10, lessonSlug: "graphing-basics", done: false },
  ] as const;

  const before = await D.withProgress(U3, profile, today, [...blocks]);
  expect(before.map((b) => b.done)).toEqual([false, false, false, false, false]);
  expect(before[0]!.progress).toEqual({ n: 0, target: 3 }); // 5 minutes of math ≈ 3 questions

  const four = [...ids];
  await db.insert(schema.questionServes).values(four.map((questionId) => ({ userId: U3, questionId, servedAt: new Date(Date.now()-6000) })));
  for (const q of four) await P.submitAnswer(U3, { questionId: q, response: "A", timeMs: 30_000, confidence: 2 });
  await db.insert(schema.lessonProgress).values([
    { userId: U3, skillId: skill.id },                                                                   // read today
    { userId: U3, skillId: "desmos:graphing-basics", completedAt: new Date(Date.now() - 2 * 86_400_000) }, // read days ago
  ]);
  const after = await D.withProgress(U3, profile, today, [...blocks]);
  expect(after.map((b) => b.done)).toEqual([true, false, false, true, false]);
  expect(after[1]!.progress).toEqual({ n: 1, target: 3 }); // 4 answers: 3 finish the first block, 1 left for the check-in
});
