/** A lost response must not leave the test permanently stuck on Submitting. The server submission is idempotent. */
export async function withinSubmissionTimeout<T>(request:Promise<T>, ms=30_000):Promise<T> {
  let timer:ReturnType<typeof setTimeout> | undefined;
  try {return await Promise.race([request,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Submission timed out')),ms);})]);}
  finally {clearTimeout(timer);}
}
