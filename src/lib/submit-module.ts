export type ModuleDraft = {position:number;response:string|null;flagged:boolean;timeMsDelta:number};
/** Abort the browser request on timeout; a committed submission is safe to retry on the server. */
export async function sendModuleSubmission(moduleId:string,drafts:ModuleDraft[]) {
  const response=await fetch("/api/tests/submit",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({moduleId,drafts}),signal:AbortSignal.timeout(30_000)});
  // A platform error page (504 timeout, 429 from the edge) is HTML or plain text, not JSON: show the retry message, not a parse error.
  const result=await response.json().catch(()=>({ok:false})) as {ok:boolean;finished?:boolean;error?:string};
  if(!response.ok || !result.ok)return {ok:false as const,error:typeof result.error==="string"?result.error:"Submission could not finish. Please retry."};
  return {ok:true as const,finished:result.finished===true};
}
