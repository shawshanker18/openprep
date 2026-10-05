import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { getUserId } from '@/server/auth';
import { readAssetToken } from '@/server/question-asset-token';
import { wasGiven } from '@/server/practice';
import { deliveryContext } from '@/server/delivery-context';
import { eventQuota } from '@/server/delivery';

export async function GET(_request:Request, {params}:{params:Promise<{questionId:string;index:string}>}) {
  const userId=await getUserId();
  if(!userId) return new Response('Sign in required',{status:401});
  const {questionId:token,index}=await params;
  if(index!=="0") return new Response('Not found',{status:404});
  const asset=readAssetToken(userId,token);
  if(!asset) return new Response('Not found',{status:404});
  try { await eventQuota(userId,await deliveryContext(),'asset'); }
  catch { return new Response('Please try again later',{status:429,headers:{'Cache-Control':'no-store'}}); }
  if(!(await wasGiven(userId,asset.questionId))) return new Response('Not found',{status:404});
  const rows=await db.execute(sql`select mime_type,bytes from private.question_assets where id=${asset.assetId}::uuid`);
  const records=Array.isArray(rows)?rows:(rows as unknown as {rows:unknown[]}).rows;
  const a=records[0] as {mime_type:string;bytes:Buffer}|undefined;
  if(!a || !/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(a.mime_type)) return new Response('Not found',{status:404});
  return new Response(new Uint8Array(a.bytes),{headers:{'Content-Type':a.mime_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox",'Vary':'Cookie'}});
}
