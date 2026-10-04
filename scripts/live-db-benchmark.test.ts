// Explicit opt-in. Read-only burst through the app's five-connection pool; no user progress changes.
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {expect,it} from 'vitest';
import {db} from '../src/db';
import {profiles} from '../src/db/schema';
import {questionBank} from '../src/server/practice';
const output=process.env.OPENPREP_DB_BENCHMARK_OUTPUT;
it.skipIf(!output)('runs 400 bounded question-bank reads',async()=>{
  const [profile]=await db.select({id:profiles.id}).from(profiles).limit(1);
  if(!profile)throw new Error('No profile exists for read-only benchmark');
  await questionBank(profile.id,{page:1});
  const started=performance.now(),latencies:number[]=[],bytes:number[]=[];
  const results=await Promise.allSettled(Array.from({length:400},async()=>{
    const at=performance.now(),result=await questionBank(profile.id,{page:1});
    latencies.push(performance.now()-at);bytes.push(Buffer.byteLength(JSON.stringify(result)));
    expect(result.rows.length).toBeLessThanOrEqual(10);
  }));
  latencies.sort((a,b)=>a-b);
  const report={requests:400,successes:results.filter(r=>r.status==='fulfilled').length,elapsedMs:Math.round(performance.now()-started),p50Ms:Math.round(latencies[Math.floor(latencies.length*.5)]??0),p95Ms:Math.round(latencies[Math.floor(latencies.length*.95)]??0),averageResultBytes:Math.round(bytes.reduce((a,b)=>a+b,0)/bytes.length),scope:'400 read-only bank calls queued through the five-connection app pool; not 400 authenticated browser users or full-site load'};
  fs.writeFileSync(output!,JSON.stringify(report,null,2));
  expect(report.successes).toBe(400);
},120000);
