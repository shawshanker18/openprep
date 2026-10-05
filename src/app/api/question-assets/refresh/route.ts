import {getUserId} from '@/server/auth';
import {createAssetToken,readAssetToken} from '@/server/question-asset-token';
import {wasGiven} from '@/server/practice';
import {eventQuota} from '@/server/delivery';
import {deliveryContext} from '@/server/delivery-context';

/** Renew only an authentic token owned by the logged-in student, so long tests retain working images. */
export async function POST(req:Request) {
  const userId=await getUserId();
  if(!userId) return new Response('Sign in required',{status:401});
  if(req.headers.get('origin')!==new URL(req.url).origin) return new Response('Forbidden',{status:403});
  const body=await req.json().catch(()=>null);
  const asset=typeof body?.token==='string' ? readAssetToken(userId,body.token,true) : null;
  if(!asset) return new Response('Not found',{status:404});
  try { await eventQuota(userId,await deliveryContext(),'asset'); }
  catch { return new Response('Please try again later',{status:429}); }
  if(!(await wasGiven(userId,asset.questionId))) return new Response('Not found',{status:404});
  return Response.json({src:`/api/question-assets/${createAssetToken(userId,asset.questionId,asset.assetId)}/0`},{headers:{'Cache-Control':'no-store'}});
}
