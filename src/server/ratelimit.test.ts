import {beforeAll,expect,it,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {drizzle} from 'drizzle-orm/pglite';
const pg=new PGlite(),db=drizzle(pg);
vi.mock('@/db',()=>({db}));
const {databaseLimit,SLOW_DOWN}=await import('./ratelimit');
beforeAll(async()=>{await pg.exec('create table delivery_windows(id text primary key,times jsonb not null,expires_at timestamptz not null)');});
it('atomically caps simultaneous requests and keeps one row per user',async()=>{
  vi.spyOn(Date,'now').mockReturnValue(1_700_000_000_000);
  const user='00000000-0000-0000-0000-0000000000aa';
  const results=await Promise.all(Array.from({length:90},()=>databaseLimit(user)));
  expect(results.filter(x=>x===null)).toHaveLength(30);
  expect(results.filter(x=>x===SLOW_DOWN)).toHaveLength(60);
  vi.spyOn(Date,'now').mockReturnValue(1_700_000_010_000);
  expect(await databaseLimit(user)).toBeNull();
  const count=await pg.query<{n:number}>('select count(*)::int n from delivery_windows');
  expect(count.rows[0]!.n).toBe(1);
  vi.restoreAllMocks();
});
