import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { questions, testItems, testModules, testSessions } from '@/db/schema';
import { getUserId } from '@/server/auth';
import { internalId, questionAssetIds } from '@/server/questions';
import { wasGiven } from '@/server/practice';

export async function GET(_request:Request, {params}:{params:Promise<{questionId:string;index:string}>}) {
  const userId=await getUserId();
  if(!userId) return new Response('Sign in required',{status:401});
  const {questionId:pub,index}=await params;
  if(!/^\d{1,2}$/.test(index)) return new Response('Not found',{status:404});
  const questionId=await internalId(pub);
  if(!questionId) return new Response('Not found',{status:404});
  const ownedTest=await db.select({id:testItems.questionId}).from(testItems)
    .innerJoin(testModules,eq(testModules.id,testItems.moduleId)).innerJoin(testSessions,eq(testSessions.id,testModules.sessionId))
    .where(and(eq(testSessions.userId,userId),eq(testItems.questionId,questionId))).limit(1);
  if(!ownedTest.length && !(await wasGiven(userId,questionId))) return new Response('Not found',{status:404});
  const [q]=await db.select().from(questions).where(eq(questions.id,questionId));
  const assetId=q && questionAssetIds(q)[Number(index)];
  if(!assetId || !/^[\da-f-]{36}$/.test(assetId)) return new Response('Not found',{status:404});
  const rows=await db.execute(sql`select mime_type,bytes from private.question_assets where id=${assetId}::uuid`);
  const records=Array.isArray(rows)?rows:(rows as unknown as {rows:unknown[]}).rows;
  const a=records[0] as {mime_type:string;bytes:Buffer}|undefined;
  if(!a || !/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(a.mime_type)) return new Response('Not found',{status:404});
  return new Response(new Uint8Array(a.bytes),{headers:{'Content-Type':a.mime_type,'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox",'Vary':'Cookie'}});
}
