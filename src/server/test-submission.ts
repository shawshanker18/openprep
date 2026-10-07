import "server-only";
import { z } from "zod";
import { text } from "@/lib/text";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { testModules, testSessions } from "@/db/schema";
import { limitPractice } from "@/server/ratelimit";
import { DeliveryBlocked } from "@/server/delivery-policy";
import { submitModule } from "@/server/tests";

export const ModuleSubmission = z.strictObject({moduleId:z.uuid(),drafts:z.array(z.strictObject({position:z.number().int().min(0).max(100),response:text().max(8).nullable(),flagged:z.boolean(),timeMsDelta:z.number().int().min(0).max(3_600_000)})).max(100).default([])});
export async function submitOwnedModule(userId:string,input:unknown) {
  const parsed=ModuleSubmission.safeParse(input);
  if(!parsed.success)return {ok:false as const,error:"Invalid module submission."};
  const [owned]=await db.select({config:testSessions.config}).from(testModules).innerJoin(testSessions,eq(testModules.sessionId,testSessions.id)).where(and(eq(testModules.id,parsed.data.moduleId),eq(testSessions.userId,userId))).limit(1);
  if(!owned)return {ok:false as const,error:"This module is unavailable."};
  const limited=await limitPractice(userId,"request");
  if(limited)return {ok:false as const,error:limited,rateLimited:true};
  try {
    const result=await submitModule(userId,parsed.data.moduleId,parsed.data.drafts);
    return result?{ok:true as const,...result}:{ok:false as const,error:"This module could not be submitted. Reload to check its saved status and try again."};
  }catch(e){if(e instanceof DeliveryBlocked)return {ok:false as const,error:e.message};throw e;}
}
