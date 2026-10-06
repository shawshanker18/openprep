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
it("allows continuing with skipped questions while enforcing minimum answer time",async()=>{
 await expect(S.answerPracticeSession(user,session,1,{response:"B",timeMs:0,confidence:1})).rejects.toThrow(/read the question/);
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
   await S.answerPracticeSession(user,session,n,{response:"A",timeMs:5000,confidence:2});
 }
 const done=await S.loadPracticeSession(user,profile,session,{kind:"next",position:4});
 expect(done).toMatchObject({done:true,answered:5});
 expect((await S.getPracticeSession(user,session))?.status).toBe("completed");
 await S.loadPracticeSession(user,profile,session,{kind:"jump",position:0});
 expect((await S.getPracticeSession(user,session))?.status).toBe("completed");
 expect(await database.select().from(schema.questionExposures)).toHaveLength(5);
});

it("rejects removed custom configurations before creating or resuming a session", async () => {
  const before = await database.select().from(schema.practiceSessions);
  await expect(S.createPracticeSession(user, {mode:"set",skillIds:[skill.id,"m-alg-lin2"],count:5}, "Removed custom builder")).rejects.toThrow();
  expect(await database.select().from(schema.practiceSessions)).toHaveLength(before.length);
  const [legacy] = await database.insert(schema.practiceSessions).values({userId:user, title:"Custom practice", config:{mode:"set",skillIds:[skill.id],count:5}}).returning();
  expect(await S.getPracticeSession(user,legacy!.id)).toBeNull();
  expect((await S.listPracticeSessions(user)).map(s=>s.id)).not.toContain(legacy!.id);
  await expect(S.loadPracticeSession(user,profile,legacy!.id)).rejects.toThrow(/not found/);
  await expect(S.savePracticeDraft(user,legacy!.id,0,"A",5000)).rejects.toThrow(/not found/);
  await expect(S.answerPracticeSession(user,legacy!.id,0,{response:"A",timeMs:5000,confidence:2})).rejects.toThrow(/not found/);
  expect(await database.select().from(schema.practiceSessions).where(eq(schema.practiceSessions.id,legacy!.id))).toHaveLength(1);
});
