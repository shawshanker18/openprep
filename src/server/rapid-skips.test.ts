import { beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
const pg=new PGlite(),db=drizzle(pg);
vi.mock("@/db",()=>({db}));
const {checkRapidSkips}=await import("./rapid-skips");
beforeAll(async()=>{await pg.exec("create table delivery_windows(id text primary key,times jsonb not null,expires_at timestamptz not null); create table question_serves(user_id uuid,question_id text,served_at timestamptz); create table attempts(id uuid,user_id uuid,question_id text,created_at timestamptz);");});
const a="00000000-0000-0000-0000-000000000001",b="00000000-0000-0000-0000-000000000002",t=1700000000000;
it("allows twenty fast deliveries, then an eight-second account-only cooldown",async()=>{
 for(let n=0;n<20;n++)await checkRapidSkips(a,"q"+n,t+n*100);
 await expect(checkRapidSkips(a,"q20",t+2000)).rejects.toThrow(/8 seconds/);
 await expect(checkRapidSkips(b,"q20",t+2000)).resolves.toBeUndefined();
 await expect(checkRapidSkips(a,"q20",t+9900)).resolves.toBeUndefined();
});
it("does not punish exact cooldown timing, reloads, or slower reading",async()=>{
 for(let n=0;n<50;n++)await checkRapidSkips(b,"q20",t+2100);
 for(let n=0;n<40;n++)await checkRapidSkips(b,"slow"+n,t+20000+n*10000);
});
it("commits repeated cooldown bypass attempts and blocks only the offending account for 48 hours",async()=>{
 const c="00000000-0000-0000-0000-000000000003";
 for(let n=0;n<20;n++)await checkRapidSkips(c,"q"+n,t+n);
 for(let n=0;n<99;n++)await expect(checkRapidSkips(c,"new",t+100+n)).rejects.toThrow(/cooldown/);
 await expect(checkRapidSkips(c,"new",t+199)).rejects.toThrow(/48 hours/);
 await expect(checkRapidSkips(c,"new",t+10000)).rejects.toThrow(/48 hours/);
 await expect(checkRapidSkips(c,"new",t+199+48*3600000)).resolves.toBeUndefined();
});

it("allows human-speed countdown use but detects sustained machine-fast timed bursts",async()=>{
 const human="00000000-0000-0000-0000-000000000004",robot="00000000-0000-0000-0000-000000000005";
 let h=t,r=t;
 for(let cycle=0;cycle<40;cycle++){
   for(let n=0;n<20;n++){await checkRapidSkips(human,"h"+cycle+"-"+n,h);h+=300;}
   h+=7700;
 }
 let detected=false;
 for(let cycle=0;cycle<60&&!detected;cycle++){
   for(let n=0;n<20;n++){try{await checkRapidSkips(robot,"r"+cycle+"-"+n,r);}catch(err){expect(String(err)).toMatch(/48 hours/);detected=true;break;}r+=50;}
   r+=7950;
 }
 expect(detected).toBe(true);
},120000); // ~2,000 sequential PGlite queries: slower than the 30s default under parallel load
