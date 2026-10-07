import fs from "node:fs";
import path from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Tx } from "@/db";
import type { DeliveryContext } from "./delivery-context";
import { SKILLS } from "@/content/taxonomy";
const pg = new PGlite(), db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
const D = await import("./delivery");
const { DELIVERY_POLICY: P } = await import("./delivery-policy");
const { databaseLimit, LIMITS } = await import("./ratelimit");
const { cleanDeliveryWindows } = await import("./delivery-maintenance");
let serial = 100;
async function user() {
  const id = `00000000-0000-0000-0000-${String(++serial).padStart(12, "0")}`;
  await db.insert(schema.profiles).values({ id }); return id;
}
const qs = Array.from({ length: 1100 }, (_, i) => ({ id: `quota-${i}`, skillId: SKILLS[i % SKILLS.length]!.id }));
const empty: DeliveryContext = { ip: null, device: null };
beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter(x => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.questions).values(qs.map(q => ({ ...q, section: "math", domain: "m-alg", difficulty: 1, type: "spr", stemMd: "s", answer: { accepted: ["1"] }, explanationMd: "e" })));
});
const expose = (u: string, items: typeof qs, context = empty) => db.transaction(tx => D.exposeQuestions(tx as unknown as Tx, u, items, context));
const history = (u: string, n: number, ageMs: number, context = empty) => db.insert(schema.questionExposures).values(qs.slice(0, n).map(q => ({ userId: u, questionId: q.id, skillId: q.skillId, firstAt: new Date(Date.now() - ageMs), ipHash: context.ip, deviceHash: context.device })));
it("does not stop normal study after daily or weekly question counts", async () => {
  for (const n of [180, 600, 1000]) {
    const u = await user(); await history(u, n, 60_000);
    await expect(expose(u, [qs[1050]!])).resolves.toBeUndefined();
  }
});
it("does not let another student on shared Wi-Fi or a shared device use up your study allowance", async () => {
  const context = { ip: "school", device: "shared-device" };
  for (let i = 0; i < 10; i++) await history(await user(), 180, 60_000, context);
  await expect(expose(await user(), [qs[1050]!], context)).resolves.toBeUndefined();
});
it("records each question only once when identical requests arrive together", async () => {
  const u = await user();
  await Promise.all(Array.from({ length: 8 }, () => expose(u, [qs[0]!])));
  expect(await db.select().from(schema.questionExposures).where(eq(schema.questionExposures.userId, u))).toHaveLength(1);
});
it("keeps a short burst limit and preserves already-delivered questions", async () => {
  const u = await user();
  for (const q of qs.slice(0, P.minute)) await D.servePractice(u, q as schema.Question, empty);
  await expect(D.servePractice(u, qs[P.minute]! as schema.Question, empty)).rejects.toThrow(/rapid requests/);
  await expect(D.servePractice(u, qs[0]! as schema.Question, empty)).resolves.toBeUndefined();
});
it("practice-set limits recover after a minute instead of stopping study for a day", async () => {
  const u = await user(), now = 1_700_000_000_000;
  vi.spyOn(Date, "now").mockReturnValue(now);
  for (let i = 0; i < P.setsPerMinute; i++) await D.eventQuota(u, empty, "set");
  await expect(D.eventQuota(u, empty, "set")).rejects.toThrow();
  vi.spyOn(Date, "now").mockReturnValue(now + 60_001);
  await expect(D.eventQuota(u, empty, "set")).resolves.toBeUndefined();
  vi.restoreAllMocks();
});
it("bounds repeated answer requests independently of study volume", async () => {
  const u = await user();
  const results = await Promise.all(Array.from({ length: 15 }, () => databaseLimit(u, "answer", "question")));
  expect(results.filter(r => r === null)).toHaveLength(LIMITS.answersPerQuestionPerMinute);
});
it('retired questions cannot be freshly exposed even from an already assembled test',async()=>{
 await db.update(schema.questions).set({status:'retired'}).where(eq(schema.questions.id,qs[699]!.id));
 await expect(expose(await user(),[qs[699]!])).rejects.toThrow(/updated/);
});
it('client roles have no access to the question bank or private quota ledgers',async()=>{
 await pg.exec('create role anon;create role authenticated');
 // Re-run only security clauses after roles exist, as on a Supabase project.
 const migration=fs.readFileSync(path.resolve(import.meta.dirname,'../../drizzle/0013_private_question_delivery.sql'),'utf8');
 for(const stmt of migration.split('--> statement-breakpoint').filter(s=>s.includes('REVOKE ALL'))) await pg.exec(stmt);
 for(const role of ['anon','authenticated']) {
  await pg.exec(`set role ${role}`);
  for(const table of ['questions','question_exposures','delivery_windows','delivery_guards'])
   await expect(pg.query(`select * from ${table}`)).rejects.toThrow(/permission denied/);
  await pg.exec('reset role');
 }
});
it('cleanup expires buckets and removes old IP/device hashes while preserving exposure history',async()=>{
 const u=await user();await history(u,1,40*86_400_000,{ip:'old-ip',device:'old-device'});
 await db.insert(schema.deliveryWindows).values({id:'expired',times:[],expiresAt:new Date(0)});
 await cleanDeliveryWindows();
 expect(await db.select().from(schema.deliveryWindows).where(eq(schema.deliveryWindows.id,'expired'))).toHaveLength(0);
 const [row]=await db.select().from(schema.questionExposures).where(eq(schema.questionExposures.userId,u));
 expect(row).toMatchObject({ipHash:null,deviceHash:null,questionId:qs[0]!.id});
});
