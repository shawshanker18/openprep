import "server-only";
import { createHash } from "node:crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { attempts, deliveryWindows, questionServes } from "@/db/schema";
import { DeliveryBlocked } from "./delivery-policy";

// Private, account-only state. Commit refusals too, so repeated bypass requests are recorded.
export async function checkRapidSkips(userId: string, questionId: string, now = Date.now()) {
  const fingerprint = parseInt(createHash("sha256").update(questionId).digest("hex").slice(0,12),16);
  const message = await db.transaction(async tx => {
    const id = `rapid-skips:${userId}`;
    await tx.insert(deliveryWindows).values({id,times:[],expiresAt:new Date(now+48*3600_000)}).onConflictDoNothing();
    const [row] = await tx.select().from(deliveryWindows).where(eq(deliveryWindows.id,id)).for("update");
    const last=row!.times[0]??0, previous=row!.times[6]??0;
    let [,count=0,cooldown=0,blocked=0,start=0,violations=0,,burstStart=0,robotic=0,continuousStart=0,cycles=0] = row!.times;
    if(previous===fingerprint) return null;
    if(blocked>now) return "Rapid automated requests detected. New practice questions are paused for your account for 48 hours.";
    if(cooldown>now) {
      if(now-start>=60_000) { start=now; violations=0; }
      violations++;
      // Timing alone is never evidence. One hundred attempts to bypass a live cooldown is.
      if(violations>=100) blocked=now+48*3600_000;
      await tx.update(deliveryWindows).set({times:[last,count,cooldown,blocked,start,violations,previous,burstStart,robotic,continuousStart,cycles],expiresAt:new Date(Math.max(blocked,now+48*3600_000))}).where(eq(deliveryWindows.id,id));
      return blocked>now ? "Rapid automated requests detected. New practice questions are paused for your account for 48 hours." : `Rapid skipping cooldown: wait ${Math.ceil((cooldown-now)/1000)} seconds, then continue.`;
    }
    const [served] = await tx.select().from(questionServes).where(eq(questionServes.userId,userId)).orderBy(desc(questionServes.servedAt)).limit(1);
    const [answer] = served ? await tx.select({id:attempts.id}).from(attempts).where(and(eq(attempts.userId,userId),eq(attempts.questionId,served.questionId),gte(attempts.createdAt,served.servedAt))).limit(1) : [];
    const finishedCooldown = cooldown>0 && now>=cooldown;
    if(finishedCooldown) {
      cycles++;
      // Combine machine-fast twenty-question bursts with repeated precise restarts.
      // Neither quick browsing nor countdown timing alone can cause a block.
      if(last-burstStart<2000 && now-cooldown<250) robotic++;
      else robotic=Math.max(0,robotic-2);
    }
    if(answer || now-last>30_000) {robotic=0;cycles=0;continuousStart=now;}
    if(!continuousStart) continuousStart=now;
    count = finishedCooldown || now-last>=10_000 || answer ? 1 : count+1;
    if(count===1) burstStart=now;
    if((robotic>=12 && now-continuousStart>=5*60_000) ||
       (cycles>=50 && robotic>=5 && now-continuousStart>=10*60_000))
      blocked=now+48*3600_000;
    cooldown = count>=20 ? now+8000 : 0;
    await tx.update(deliveryWindows).set({times:[now,count,cooldown,blocked,start,violations,fingerprint,burstStart,robotic,continuousStart,cycles],expiresAt:new Date(now+48*3600_000)}).where(eq(deliveryWindows.id,id));
    return blocked>now ? "Rapid automated requests detected. New practice questions are paused for your account for 48 hours." : null;
  });
  if(message) throw new DeliveryBlocked(message);
}
