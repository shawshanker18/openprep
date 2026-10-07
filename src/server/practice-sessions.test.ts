import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { SKILLS } from "@/content/taxonomy";
vi.mock("./delivery-context",()=>({deliveryContext:async()=>({ip:null,device:null})}));
const pg=new PGlite(),database=drizzle(pg,{schema});
vi.mock("@/db",()=>({db:database}));
const S=await import("./practice-sessions");
const user=randomUUID(),other=randomUUID();
const skill=SKILLS.find(s=>s.section==="math")!;
const ids=[0,1,2,3,4].map(n=>`saved-${n}`);
let session:string;
let profile:schema.Profile;
beforeAll(async()=>{
 const dir=path.resolve(import.meta.dirname,"../../drizzle");
 for(const file of fs.readdirSync(dir).filter(f=>f.endsWith(".sql")&&!f.startsWith("0001")).sort())
  for(const stmt of fs.readFileSync(path.join(dir,file),"utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
 await database.insert(schema.profiles).values([{id:user},{id:other}]);
 profile=(await database.select().from(schema.profiles).where(eq(schema.profiles.id,user)))[0]!;
 await database.insert(schema.skillState).values(SKILLS.map(s=>({userId:user,skillId:s.id})));
 const candidates=await pg.query<{id:string}>("select 'practice-fixture-' || n as id from generate_series(1,100) n where mod(abs(hashtext('practice-fixture-' || n)::bigint),5)<>0 limit 5");
 ids.splice(0,ids.length,...candidates.rows.map(r=>r.id));
 await database.insert(schema.questions).values(ids.map(id=>({id,skillId:skill.id,section:skill.section,domain:skill.domain,difficulty:2,type:"mcq" as const,stemMd:"stem",choices:[{id:"A",md:"one"}],answer:{choice:"A"},explanationMd:"solution"})));
 session=await S.createPracticeSession(user,{mode:"set",skillIds:[skill.id],count:5},"Lesson practice");
});
it("saves only reached questions and restores an unattempted answer across requests",async()=>{
 const first=await S.loadPracticeSession(user,profile,session);
 expect(first.done).toBe(false);
 if(first.done) throw Error("missing question");
 expect(JSON.stringify(first)).not.toMatch(/solution|saved-/);
 expect(first.question).toMatchObject({skillId:"m-alg-lin1",domain:"m-alg",difficulty:2});
 await S.savePracticeDraft(user,session,0,"A",23000);
 const restored=await S.loadPracticeSession(user,profile,session);
 expect(restored).toMatchObject({position:0,question:{id:first.question.id},response:"A",timeMs:23000,result:null,answered:0});
 expect(await database.select().from(schema.practiceSessionItems)).toHaveLength(1);
 expect(await database.select().from(schema.questionExposures)).toHaveLength(1);
});
it("restores beyond the old thirty-minute pending limit without consuming fresh exposure or resetting the clock",async()=>{
 const old=new Date(Date.now()-7*86400_000);
 await database.update(schema.questionServes).set({servedAt:old}).where(eq(schema.questionServes.userId,user));
 await database.update(schema.practiceSessionItems).set({servedAt:old}).where(eq(schema.practiceSessionItems.sessionId,session));
 const restored=await S.loadPracticeSession(user,profile,session);
 expect(restored).toMatchObject({done:false,response:"A",timeMs:23000,result:null});
 const [served]=await database.select().from(schema.questionServes).where(eq(schema.questionServes.userId,user));
 expect(served!.servedAt).toEqual(old);
 expect(await database.select().from(schema.questionExposures)).toHaveLength(1);
});
it("records answer and session progress together, retries without double counting, and restores the explanation",async()=>{
 await S.answerPracticeSession(user,session,0,{response:"A",timeMs:24000,confidence:2});
 await S.answerPracticeSession(user,session,0,{response:"A",timeMs:24000,confidence:2});
 await expect(S.answerPracticeSession(user,session,0,{response:"B",timeMs:24000,confidence:2})).rejects.toThrow(/already/);
 await S.savePracticeDraft(user,session,0,"B",30000); // stale auto-save cannot overwrite the submitted answer
 const restored=await S.loadPracticeSession(user,profile,session);
 expect(restored).toMatchObject({answered:1,correct:1,response:"A",result:{correct:true,revealed:{explanationMd:"solution"}}});
 const a=await database.select().from(schema.attempts);
 expect(a).toHaveLength(1);expect(a[0]!.sessionId).toBe(session);
});
it("parallel Next retries advance once, skipped questions remain unattempted, and jumps cannot reveal future questions",async()=>{
 const results=await Promise.all([S.loadPracticeSession(user,profile,session,{kind:"next",position:0}),S.loadPracticeSession(user,profile,session,{kind:"next",position:0})]);
 expect(results.map(r=>r.position)).toEqual([1,1]);
 expect(await database.select().from(schema.practiceSessionItems)).toHaveLength(2);
 await S.savePracticeDraft(user,session,1,"B",17000);
 const skipped=await S.loadPracticeSession(user,profile,session,{kind:"next",position:1});
 expect(skipped.items).toEqual([{position:0,attempted:true},{position:1,attempted:false},{position:2,attempted:false}]);
 const resumed=await S.loadPracticeSession(user,profile,session,{kind:"jump",position:1});
 expect(resumed).toMatchObject({position:1,response:"B",timeMs:17000,result:null});
 await expect(S.loadPracticeSession(user,profile,session,{kind:"jump",position:4})).rejects.toThrow(/not found/);
});
it("allows quick answers and continuing with skipped questions",async()=>{
 await expect(S.answerPracticeSession(user,session,1,{response:"B",timeMs:0,confidence:1})).resolves.toBeUndefined();
 await expect(S.loadPracticeSession(user,profile,session,{kind:"next",position:1})).resolves.toMatchObject({position:2}); // already reached
 await expect(S.loadPracticeSession(user,profile,session,{kind:"next",position:2})).resolves.toMatchObject({position:3});
 expect((await S.getPracticeSession(user,session))?.cursor).toBe(3); // skipped questions do not block the next question
 expect(await database.select().from(schema.practiceSessionItems)).toHaveLength(4);
});
it("rejects cross-account reads, saves, answers, and random session IDs",async()=>{
 expect(await S.getPracticeSession(other,session)).toBeNull();
 expect(await S.listPracticeSessions(other)).toEqual([]);
 await expect(S.loadPracticeSession(other,profile,session)).rejects.toThrow(/not found/);
 await expect(S.savePracticeDraft(other,session,0,"A",0)).rejects.toThrow(/not found/);
 await expect(S.answerPracticeSession(other,session,0,{response:"A",timeMs:0,confidence:2})).rejects.toThrow(/not found/);
 await expect(S.loadPracticeSession(user,profile,randomUUID())).rejects.toThrow(/not found/);
});
it("new questions use cumulative session positions; completing then reviewing keeps a session completed",async()=>{
 for(let n=1;n<5;n++) {
   if(n>=3) await S.loadPracticeSession(user,profile,session,{kind:"next",position:n-1});
   await database.update(schema.questionServes).set({servedAt:new Date(Date.now()-6000)}).where(eq(schema.questionServes.userId,user));
   const row=(await database.select().from(schema.practiceSessionItems).where(and(eq(schema.practiceSessionItems.sessionId,session),eq(schema.practiceSessionItems.position,n))))[0];
   const serve=(await database.select().from(schema.questionServes).where(eq(schema.questionServes.questionId,row!.questionId)))[0];
   await database.update(schema.practiceSessionItems).set({servedAt:serve!.servedAt}).where(and(eq(schema.practiceSessionItems.sessionId,session),eq(schema.practiceSessionItems.position,n)));
   await S.answerPracticeSession(user,session,n,{response:n===1?"B":"A",timeMs:5000,confidence:2});
 }
 const done=await S.loadPracticeSession(user,profile,session,{kind:"next",position:4});
 expect(done).toMatchObject({done:true,answered:5});
 expect((await S.getPracticeSession(user,session))?.status).toBe("completed");
 await S.loadPracticeSession(user,profile,session,{kind:"jump",position:0});
 expect((await S.getPracticeSession(user,session))?.status).toBe("completed");
 expect(await database.select().from(schema.questionExposures)).toHaveLength(5);
});

it("supports multi-skill bank sessions and preserves legacy saved sessions", async () => {
  const bank = await S.createPracticeSession(user, {mode:"set",skillIds:[skill.id,"m-alg-lin2"],count:5}, "Question Bank");
  expect((await S.getPracticeSession(user,bank))?.config.skillIds).toHaveLength(2);
  expect((await S.listPracticeSessions(user)).map(s=>s.id)).toContain(bank);
  const [legacy] = await database.insert(schema.practiceSessions).values({userId:user, title:"Custom practice", config:{mode:"set",skillIds:[skill.id],count:5}}).returning();
  expect(await S.getPracticeSession(user,legacy!.id)).not.toBeNull();
});
it("excludes active session and test questions from preview queries and restores availability after completion", async () => {
  const {availableQuestion} = await import("./question-availability");
  const sid=await S.createPracticeSession(other,{mode:"set",skillIds:[skill.id],count:5},"Question Bank");
  await database.insert(schema.practiceSessionItems).values({sessionId:sid,position:0,questionId:ids[0]!,servedAt:new Date()});
  const [test]=await database.insert(schema.testSessions).values({userId:other,kind:"module"}).returning();
  const [module]=await database.insert(schema.testModules).values({sessionId:test!.id,idx:0,section:"math"}).returning();
  await database.insert(schema.testItems).values({moduleId:module!.id,position:0,questionId:ids[1]!});
  const available=()=>database.select({id:schema.questions.id}).from(schema.questions).where(availableQuestion(other));
  expect((await available()).map(q=>q.id)).not.toContain(ids[0]);
  expect((await available()).map(q=>q.id)).not.toContain(ids[1]);
  expect((await database.select({id:schema.questions.id}).from(schema.questions).where(availableQuestion(user))).map(q=>q.id)).toContain(ids[1]);
  await database.update(schema.practiceSessions).set({status:"completed"}).where(eq(schema.practiceSessions.id,sid));
  await database.update(schema.testSessions).set({status:"completed"}).where(eq(schema.testSessions.id,test!.id));
  expect((await available()).map(q=>q.id)).toEqual(expect.arrayContaining([ids[0],ids[1]]));
});
it("applies selected difficulties to question previews and every question in a multi-skill bank session", async () => {
  const student=randomUUID();
  await database.insert(schema.profiles).values({id:student});
  const studentProfile=(await database.select().from(schema.profiles).where(eq(schema.profiles.id,student)))[0]!;
  await database.insert(schema.questions).values([1,2,3].map(d=>({id:`difficulty-${d}`,skillId:skill.id,section:skill.section,domain:skill.domain,difficulty:d,type:"mcq" as const,stemMd:"Sample question",choices:[{id:"A",md:"Answer"}],answer:{choice:"A"},explanationMd:"Stored explanation"})));
  const {previewQuestions}=await import("./bank-preview");
  const previews=await previewQuestions(student,[skill.id],[3]);
  expect(previews).toHaveLength(1);
  expect(previews[0]!.difficulty).toBe(3);
  expect(JSON.stringify(previews)).not.toContain('Stored explanation');
  expect(previews[0]).not.toHaveProperty('answer');
  const sid=await S.createPracticeSession(student,{mode:"set",skillIds:[skill.id,"m-alg-lin2"],difficulties:[2,3],count:5},"Question Bank");
  for(let position=0;position<5;position++) {
    const question=await S.loadPracticeSession(student,studentProfile,sid,position===0?{kind:"resume"}:{kind:"next",position:position-1});
    expect(question.done).toBe(false);
    if(question.done) throw new Error("No question selected");
    expect([2,3]).toContain(question.question.difficulty);
  }
});
it("steps adaptive difficulty up after correct answers and down after misses, including skill switches and SAT boundaries", async () => {
  const student=randomUUID();
  const second=SKILLS.find(s=>s.section==='math' && s.id!==skill.id)!;
  const {localDate,weekOf}=await import('@/engine/plan');
  await database.insert(schema.profiles).values({id:student,weeklyFocus:{weekOf:weekOf(localDate(new Date(),'Asia/Kolkata')),skillIds:[skill.id,second.id]}});
  await database.insert(schema.skillState).values(SKILLS.map(s=>({userId:student,skillId:s.id})));
  const profile=(await database.select().from(schema.profiles).where(eq(schema.profiles.id,student)))[0]!;
  await database.insert(schema.questions).values([skill,second].flatMap(s=>[1,2,3].flatMap(d=>[0,1,2,3].map(n=>({id:`adaptive-${s.id}-${d}-${n}`,skillId:s.id,section:s.section,domain:s.domain,difficulty:d,type:'mcq' as const,stemMd:'Solve this question',choices:[{id:'A',md:'Correct'},{id:'B',md:'Incorrect'}],answer:{choice:'A'},explanationMd:'Stored solution'})))));
  const random=vi.spyOn(Math,'random').mockReturnValue(0.5);
  try {
    const sid=await S.createPracticeSession(student,{mode:'smart',count:8},'Recommended Practice');
    const levels=[2,3,2,1,1,2,3,3], responses=['A','B','B','B','A','A','A','A'];
    for(let position=0;position<levels.length;position++) {
      const current=await S.loadPracticeSession(student,profile,sid,position===0?{kind:'resume'}:{kind:'next',position:position-1});
      expect(current.done).toBe(false);
      if(current.done) throw new Error('No question selected');
      expect(current.question.difficulty).toBe(levels[position]);
      if(position===5) expect(current.question.skillId).toBe(second.id);
      const old=new Date(Date.now()-6000);
      await database.update(schema.questionServes).set({servedAt:old}).where(eq(schema.questionServes.userId,student));
      await database.update(schema.practiceSessionItems).set({servedAt:old}).where(and(eq(schema.practiceSessionItems.sessionId,sid),eq(schema.practiceSessionItems.position,position)));
      await S.answerPracticeSession(student,sid,position,{response:responses[position]!,timeMs:6000,confidence:2});
    }
  } finally {random.mockRestore();}
});
it("reserves fresh test questions from practice while allowing review after an attempt",async()=>{
 const {availableQuestion}=await import("./question-availability");
 const candidate=await pg.query<{id:string}>("select 'reserved-' || n as id from generate_series(1,100) n where mod(abs(hashtext('reserved-' || n)::bigint),5)=0 limit 1");
 const id=candidate.rows[0]!.id;
 await database.insert(schema.questions).values({id,skillId:skill.id,section:skill.section,domain:skill.domain,difficulty:2,type:"mcq",stemMd:"Reserved",choices:[{id:"A",md:"1"}],answer:{choice:"A"},explanationMd:""});
 const lookup=(includeReserved=false)=>database.select().from(schema.questions).where(and(eq(schema.questions.id,id),availableQuestion(other,undefined,includeReserved)));
 expect(await lookup()).toHaveLength(0);
 expect(await lookup(true)).toHaveLength(1);
 await database.insert(schema.attempts).values({userId:other,questionId:id,skillId:skill.id,response:"A",correct:true,timeMs:5000,context:"practice",thetaBefore:0,thetaAfter:0});
 expect(await lookup()).toHaveLength(1);
});
it("finds the newest active session even when completed history would fill the first page",async()=>{
 const student=randomUUID();await database.insert(schema.profiles).values({id:student});
 const config={mode:"set",skillIds:[skill.id],count:5} as const;
 await database.insert(schema.practiceSessions).values(Array.from({length:60},()=>({userId:student,title:"Completed",config:{...config,skillIds:[skill.id]},status:"completed",updatedAt:new Date()})));
 await database.insert(schema.practiceSessions).values([
  {userId:student,title:"Older active",config:{...config,skillIds:[skill.id]},updatedAt:new Date("2026-01-01")},
  {userId:student,title:"Newest active",config:{...config,skillIds:[skill.id]},updatedAt:new Date("2026-02-01")},
 ]);
 expect(await S.latestActivePracticeSession(student)).toMatchObject({title:"Newest active"});
 expect(await S.latestActivePracticeSession(randomUUID())).toBeNull();
});
