"use server";
import { z } from "zod";
import { text } from "@/lib/text";
import { requireUser } from "@/server/auth";
import { limitPractice } from "@/server/ratelimit";
import { DeliveryBlocked } from "@/server/delivery-policy";
import { answerPracticeSession, loadPracticeSession, savePracticeDraft } from "@/server/practice-sessions";

const reference = {sessionId:z.uuid(), position:z.number().int().min(0).max(99)};
const Draft = z.strictObject({...reference,response:text().max(8).nullable(),timeMs:z.number().int().min(0).max(86400_000)});
const Load = z.strictObject({sessionId:z.uuid(),kind:z.enum(["resume","next","jump"]),position:z.number().int().min(0).max(100).optional(),similar:z.boolean().optional()});
async function result<T>(run:()=>Promise<T>) {
  try {return {ok:true as const,data:await run()};}
  catch(e) {if(e instanceof DeliveryBlocked) return {ok:false as const,error:e.message}; throw e;}
}
export async function loadSavedPractice(input:z.input<typeof Load>) {
  const {userId,profile}=await requireUser();
  const p=Load.safeParse(input);
  if(!p.success) return {ok:false as const,error:"Invalid request."};
  const limited=await limitPractice(userId,"request");
  if(limited) return {ok:false as const,error:limited};
  return result(()=>loadPracticeSession(userId,profile,p.data.sessionId,p.data,!!p.data.similar));
}
export async function saveSavedPractice(input:z.input<typeof Draft>) {
  const {userId}=await requireUser();
  const p=Draft.safeParse(input);
  if(!p.success) return {ok:false as const,error:"Invalid draft."};
  const limited=await limitPractice(userId,"request");
  if(limited) return {ok:false as const,error:limited};
  return result(()=>savePracticeDraft(userId,p.data.sessionId,p.data.position,p.data.response,p.data.timeMs));
}
const Answer = Draft.extend({confidence:z.union([z.literal(1),z.literal(2),z.literal(3)])});
export async function answerSavedPractice(input:z.input<typeof Answer>) {
  const {userId}=await requireUser();
  const p=Answer.safeParse(input);
  if(!p.success) return {ok:false as const,error:"Invalid answer."};
  const limited=await limitPractice(userId,"answer",`${p.data.sessionId}:${p.data.position}`);
  if(limited) return {ok:false as const,error:limited};
  return result(()=>answerPracticeSession(userId,p.data.sessionId,p.data.position,p.data));
}
