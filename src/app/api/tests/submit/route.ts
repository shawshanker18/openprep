import { getUserId } from "@/server/auth";
import { readJsonBody, InvalidBody } from "@/server/request-body";
import { submitOwnedModule } from "@/server/test-submission";

export const maxDuration = 60;
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
/** Independent fetch avoids the browser's serialized Server Action autosave queue. */
export async function POST(request:Request) {
  if(request.headers.get("origin")!==new URL(request.url).origin)return reply({ok:false,error:"Invalid request."},403);
  try {
    const userId=await getUserId();
    if(!userId)return reply({ok:false,error:"Sign in again to submit your test. Your draft answers remain on this device."},401);
    const result=await submitOwnedModule(userId,await readJsonBody(request,32*1024));
    return reply(result,result.ok?200:"rateLimited" in result?429:400);
  }catch(e){if(e instanceof InvalidBody)return reply({ok:false,error:e.message},e.status);return reply({ok:false,error:"Submission is temporarily unavailable. Your answers are kept on this device; please retry."},503);}
}
