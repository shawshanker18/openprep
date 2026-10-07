import { checkRapidSkips } from "./rapid-skips";
import { availableQuestion } from "./question-availability";
import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { attempts, bookmarks, practiceSessions as sessions, practiceSessionItems as items, questionServes, questions, type Profile, type Question } from "@/db/schema";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { masteryPct } from "@/engine/mastery";
import { PaperConfigSchema, type PaperConfig } from "./papers";
import { deliveryContext } from "./delivery-context";
import { consumeWindow, eventQuota, lockDelivery, servePractice } from "./delivery";
import { DeliveryBlocked } from "./delivery-policy";
import { internalIds, toPublic, toRevealed } from "./questions";
import { inRunningTest } from "./tests";
import { selectPracticeQuestion, submitAnswer, timeLimitFor } from "./practice";

const displayTitle = (title: string) => /^recommended practice$/i.test(title) ? "Adaptive Practice" : title;

export async function createPracticeSession(userId: string, config: PaperConfig, title: string, back?: string) {
  const parsed = PaperConfigSchema.parse(config);
  await eventQuota(userId, await deliveryContext(), "set");
  const [session] = await db.insert(sessions).values({userId, config: parsed, title: displayTitle(title), back}).returning({id: sessions.id});
  return session!.id;
}
export async function getPracticeSession(userId: string, id: string) {
  const session = (await db.select().from(sessions).where(and(eq(sessions.id, id), eq(sessions.userId, userId))))[0];
  return session && PaperConfigSchema.safeParse(session.config).success ? { ...session, title: displayTitle(session.title) } : null;
}
export async function listPracticeSessions(userId: string, page = 1) {
  // No question catalogue or text is returned by the history list.
  return db.select({id:sessions.id, title:sessions.title, status:sessions.status, cursor:sessions.cursor, updatedAt:sessions.updatedAt})
    .from(sessions).where(and(eq(sessions.userId,userId))).orderBy(desc(sessions.updatedAt),desc(sessions.id)).limit(50).offset((page-1)*50).then(rows => rows.map(row => ({ ...row, title: displayTitle(row.title) })));
}
/** Dashboard resume query stays bounded even after hundreds of completed sessions. */
export async function latestActivePracticeSession(userId:string) {
  const [session]=await db.select({id:sessions.id,title:sessions.title}).from(sessions)
    .where(and(eq(sessions.userId,userId),eq(sessions.status,"active")))
    .orderBy(desc(sessions.updatedAt),desc(sessions.id)).limit(1);
  return session ? { ...session, title: displayTitle(session.title) } : null;
}
async function owned(tx: Tx, userId: string, id: string) {
  const [session] = await tx.select().from(sessions).where(and(eq(sessions.id,id),eq(sessions.userId,userId))).for("update");
  if (!session || !PaperConfigSchema.safeParse(session.config).success) throw new DeliveryBlocked("Practice session not found.");
  return session;
}
const itemKey = (id: string, position: number) => and(eq(items.sessionId,id),eq(items.position,position));
async function progress(tx: Tx, id: string, target: number) {
  const rows = await tx.select({position:items.position, attemptId:items.attemptId, correct:attempts.correct, timeMs:attempts.timeMs})
    .from(items).leftJoin(attempts,eq(items.attemptId,attempts.id)).where(eq(items.sessionId,id)).orderBy(asc(items.position));
  return {target, answered:rows.filter(r=>r.attemptId).length, correct:rows.filter(r=>r.attemptId && r.correct).length,
    ms:rows.reduce((sum,r)=>sum+(r.attemptId?r.timeMs??0:0),0),
    items:rows.map(r=>({position:r.position, attempted:!!r.attemptId}))};
}
/** Serialized per account/session; a retry cannot move twice or deliver a different question at the same position. */
export async function loadPracticeSession(userId: string, profile: Profile, id: string,
  navigation: {kind:"resume"|"next"|"jump"; position?:number} = {kind:"resume"}, similar = false) {
  const context = await deliveryContext();
  const before = await getPracticeSession(userId,id);
  if(!before) throw new DeliveryBlocked("Practice session not found.");
  const config = PaperConfigSchema.parse(before.config);
  const beforeItems = await db.select().from(items).where(eq(items.sessionId,id)).orderBy(asc(items.position));
  const ids = config.ids ? await internalIds(config.ids,userId) : undefined;
  if(config.ids && ids?.length!==config.ids.length) throw new DeliveryBlocked("Question not found.");
  const selectingSimilar = similar && navigation.kind==="next" && navigation.position===before.cursor;
  const wanted = navigation.kind==="next" && navigation.position===before.cursor ? before.cursor+1 : navigation.kind==="jump"?navigation.position:before.cursor;
  let candidate: Question | null = null;
  if(wanted!==undefined && wanted<config.count && !beforeItems.some(i=>i.position===wanted)) {
    const source=beforeItems.find(i=>i.position===before.cursor);
    if(selectingSimilar && !source?.attemptId) throw new DeliveryBlocked("Answer your question first.");
    const [previous] = selectingSimilar && source ? await db.select({skillId:questions.skillId}).from(questions).where(eq(questions.id,source.questionId)) : [];
    candidate=await selectPracticeQuestion(userId,profile,{...config,mode:selectingSimilar?"skill":config.mode,skillId:previous?.skillId??config.skillId,ids,exclude:beforeItems.map(i=>i.questionId),exploratory:selectingSimilar});
  }
  if(candidate) await checkRapidSkips(userId,candidate.id);
  return db.transaction(async tx => {
    await lockDelivery(tx,userId,context);
    const session = await owned(tx,userId,id);
    const rows = await tx.select().from(items).where(eq(items.sessionId,id)).orderBy(asc(items.position));
    let position = session.cursor;
    if (navigation.kind === "next" && navigation.position === session.cursor) position++;
    if (navigation.kind === "jump") {
      if (!rows.some(r=>r.position===navigation.position)) throw new DeliveryBlocked("Question not found in this session.");
      position = navigation.position!;
    }
    position = Math.min(position,config.count);
    let item = rows.find(r=>r.position===position);
    const applySimilar=selectingSimilar && navigation.position===session.cursor;
    const similarSource = rows.find(r=>r.position===session.cursor);
    if (applySimilar && (!similarSource?.attemptId || navigation.kind!=="next")) throw new DeliveryBlocked("Answer your question first.");
    if (!item && position<config.count) {
      if(applySimilar) {
        for(const scope of [{id:`similar:user:${userId}`,max:60},...(context.device?[{id:`similar:device:${context.device}`,max:120}]:[]),...(context.ip?[{id:`similar:ip:${context.ip}`,max:3000}]:[])])
          await consumeWindow(tx,scope.id,scope.max,60_000);
      }
      if(candidate) {
        const candidateId = candidate.id;
        if(rows.some(r=>r.questionId===candidateId)) throw new DeliveryBlocked("Your session changed in another tab. Reload to continue.");
        const [available] = await tx.select({id:questions.id}).from(questions).where(and(eq(questions.id,candidate.id),availableQuestion(userId,id)));
        if (!available) {
          candidate = await selectPracticeQuestion(userId,profile,{...config,ids,exclude:rows.map(r=>r.questionId)});
          if (!candidate) throw new DeliveryBlocked("No questions are available with these filters. Resume an active session or choose other skills.");
        }
        await servePractice(userId,candidate,context,undefined,tx);
        const [serve] = await tx.select().from(questionServes).where(and(eq(questionServes.userId,userId),eq(questionServes.questionId,candidate.id)));
        [item] = await tx.insert(items).values({sessionId:id,position,questionId:candidate.id,servedAt:serve!.servedAt}).returning();
      } else position = config.count;
    }
    // Re-opening never issues a new set token or resets the session's question count.
    const summary = await progress(tx,id,config.count);
    await tx.update(sessions).set({cursor:position,updatedAt:new Date(),status:(summary.answered===config.count || (!item || session.status==="completed") && summary.answered===summary.items.length)?"completed":"active"}).where(eq(sessions.id,id));
    if(!item) return {done:true as const,position,...summary};
    const [q] = await tx.select().from(questions).where(eq(questions.id,item.questionId));
    if(!q || q.status!=="active") throw new DeliveryBlocked("This question has been withdrawn. Start another session.");
    if(await inRunningTest(userId,q.id,tx)) throw new DeliveryBlocked("Finish your test before opening this question in practice.");
    const [saved] = await tx.select().from(bookmarks).where(and(eq(bookmarks.userId,userId),eq(bookmarks.questionId,q.id)));
    let result = null;
    if(item.attemptId) {
      const [a] = await tx.select().from(attempts).where(and(eq(attempts.id,item.attemptId),eq(attempts.userId,userId),eq(attempts.questionId,q.id)));
      if(!a) throw new DeliveryBlocked("Saved answer not found.");
      result = {correct:a.correct,attemptId:a.id,revealed:toRevealed(q,userId),masteryBefore:masteryPct(a.thetaBefore),masteryAfter:masteryPct(a.thetaAfter),mistakeGuess:a.mistakeType,skillName:SKILL_BY_ID[q.skillId]?.name??q.skillId};
    } else {
      const [serve] = await tx.select().from(questionServes).where(and(eq(questionServes.userId,userId),eq(questionServes.questionId,q.id)));
      // Another session may have re-served it. Re-establish delivery through the normal quotas, never bypass them.
      if(serve?.servedAt.getTime()!==item.servedAt.getTime()) {
        await servePractice(userId,q,context,undefined,tx);
        const [fresh] = await tx.select().from(questionServes).where(and(eq(questionServes.userId,userId),eq(questionServes.questionId,q.id)));
        item.servedAt=fresh!.servedAt;
        await tx.update(items).set({servedAt:item.servedAt}).where(itemKey(id,position));
      }
    }
    return {done:false as const,position,...summary,question:toPublic(q,userId),response:item.response,timeMs:item.timeMs,
      timeLimitS:await timeLimitFor(userId,q,config.timing,tx),bookmarked:!!saved,result};
  });
}
export async function savePracticeDraft(userId: string, id: string, position: number, response: string|null, timeMs: number) {
  return db.transaction(async tx => {
    await owned(tx,userId,id);
    const [item] = await tx.select().from(items).where(itemKey(id,position));
    if(!item) throw new DeliveryBlocked("Question not found in this session.");
    if(!item.attemptId) await tx.update(items).set({response,timeMs}).where(itemKey(id,position));
    await tx.update(sessions).set({updatedAt:new Date()}).where(eq(sessions.id,id));
  });
}
export async function answerPracticeSession(userId: string, id: string, position: number,
  input: {response:string|null;timeMs:number;confidence:1|2|3|null}) {
  const context = await deliveryContext();
  return db.transaction(async tx => {
    await lockDelivery(tx,userId,context);
    await owned(tx,userId,id);
    const [item] = await tx.select().from(items).where(itemKey(id,position));
    if(!item) throw new DeliveryBlocked("Question not found in this session.");
    if(item.attemptId) {
      const [a] = await tx.select().from(attempts).where(and(eq(attempts.id,item.attemptId),eq(attempts.userId,userId)));
      if(a?.response!==input.response) throw new DeliveryBlocked("This question has already been answered.");
      return; // Client reloads the authoritative saved result.
    }
    const result = await submitAnswer(userId,{...input,questionId:item.questionId},tx,{id,servedAt:item.servedAt});
    if(!result) throw new DeliveryBlocked("Reload your saved session before answering this question.");
    const [a] = await tx.select().from(attempts).where(eq(attempts.id,result.attemptId));
    // Answer and session item commit together, including lost-response retries.
    await tx.update(items).set({response:input.response,timeMs:a!.timeMs,attemptId:result.attemptId}).where(itemKey(id,position));
    await tx.update(sessions).set({updatedAt:new Date()}).where(eq(sessions.id,id));
  });
}
