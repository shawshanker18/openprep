import fs from 'node:fs';
import path from 'node:path';
import {beforeAll,expect,it,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {drizzle} from 'drizzle-orm/pglite';
import * as schema from '@/db/schema';
vi.mock("@/server/delivery-context",()=>({deliveryContext:async()=>({ip:null,device:null})}));
const pg=new PGlite(),db=drizzle(pg,{schema});
const state=vi.hoisted(()=>({user:null as string|null}));
vi.mock('@/db',()=>({db}));
vi.mock('@/server/auth',()=>({getUserId:async()=>state.user}));
const {GET}=await import('@/app/api/question-assets/[questionId]/[index]/route');
const {toPublic}=await import('./questions');
const USER='00000000-0000-0000-0000-0000000000dd',OTHER='00000000-0000-0000-0000-0000000000ee';
const ID='image-fixture',ASSET='00000000-0000-0000-0000-000000000001';
const {createAssetToken}=await import('./question-asset-token');
const request=(index='0')=>GET(new Request('https://example.com'),{params:Promise.resolve({questionId:createAssetToken(USER,ID,ASSET),index})});
beforeAll(async()=>{
  const dir=path.resolve(import.meta.dirname,'../../drizzle');
  for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.sql')&&!x.startsWith('0001')).sort())
    for(const stmt of fs.readFileSync(path.join(dir,file),'utf8').split('--> statement-breakpoint'))await pg.exec(stmt);
  await pg.exec(`create schema private; create table private.question_assets(id uuid primary key,mime_type text,bytes bytea);insert into private.question_assets values('${ASSET}','image/png',decode('89504e470d0a1a0a','hex'))`);
  await db.insert(schema.profiles).values([{id:USER},{id:OTHER}]);
  await db.insert(schema.questions).values({id:ID,skillId:'m-alg-lin1',section:'math',domain:'m-alg',difficulty:1,type:'spr',stemMd:`![Diagram](asset://${ASSET})`,answer:{accepted:['1']},explanationMd:''});
  await db.insert(schema.questionServes).values({userId:USER,questionId:ID});
});
it('requires sign-in and a question assigned to the same user',async()=>{
  state.user=null;expect((await request()).status).toBe(401);
  state.user=OTHER;expect((await request()).status).toBe(404);
});
it('serves referenced image bytes privately and hides storage identifiers',async()=>{
  state.user=USER;const response=await request();
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('image/png');
  expect(response.headers.get('cache-control')).toContain('private');
  expect(new Uint8Array(await response.arrayBuffer())).toHaveLength(8);
  const [q]=await db.select().from(schema.questions);
  const pub=toPublic(q!,USER);
  expect(pub.stemMd).toContain(`/api/question-assets/`);
  expect(pub.stemMd).not.toContain(ID);
  expect(JSON.stringify(pub)).not.toContain(ASSET);
});
it('does not let a caller enumerate unrelated assets',async()=>{
  state.user=USER;expect((await request('1')).status).toBe(404);
  expect((await request('../0')).status).toBe(404);
});
