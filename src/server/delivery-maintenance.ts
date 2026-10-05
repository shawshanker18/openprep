import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliveryWindows, deliveryGuards, questionExposures } from "@/db/schema";

export async function cleanDeliveryWindows() {
  await db.delete(deliveryWindows).where(sql`${deliveryWindows.expiresAt}<now()`);
  await db.delete(deliveryGuards).where(sql`${deliveryGuards.expiresAt}<now()`);
  // Retain the first-exposure history; strip old network identifiers after 30 days.
  await db.update(questionExposures).set({ipHash:null,deviceHash:null})
    .where(sql`${questionExposures.firstAt}<now()-interval '30 days' and (${questionExposures.ipHash} is not null or ${questionExposures.deviceHash} is not null)`);
}

export async function exposureOverview() {
  const questions = await db.execute(sql`select e.question_id, q.status, count(*)::int accounts,
      count(*) filter(where e.first_at>now()-interval '1 day')::int today
    from question_exposures e join questions q on q.id=e.question_id
    group by e.question_id,q.status order by today desc,accounts desc limit 50`);
  const shared = await db.execute(sql`select 'device' scope, device_hash subject, count(distinct user_id)::int accounts,count(*)::int questions
    from question_exposures where first_at>now()-interval '7 days' and device_hash is not null group by device_hash having count(distinct user_id)>1
    union all select 'ip',ip_hash,count(distinct user_id)::int,count(*)::int
    from question_exposures where first_at>now()-interval '7 days' and ip_hash is not null group by ip_hash having count(distinct user_id)>1
    order by accounts desc,questions desc limit 50`);
  return { questions, shared };
}

export async function findCopyOwner(copyRef:string, questionId:string) {
  const { digest }=await import('./delivery-identity');
  const rows=await db.select({userId:questionExposures.userId}).from(questionExposures).where(eq(questionExposures.questionId,questionId));
  return rows.find(r=>digest(`copy:${r.userId}:${questionId}`).slice(0,16)===copyRef)?.userId??null;
}
