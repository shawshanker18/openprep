import fs from "node:fs";
import path from "node:path";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";

const pg = new PGlite(), db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
const M = await import("./membership");
const S = await import("./subscription");

const A = "00000000-0000-0000-0000-0000000000a1";
const day = 86_400_000;
const NOW = new Date("2026-03-01T00:00:00Z");
let n = 0;
const buy = async (tier: "plus" | "pro", days: number, cents = 700) =>
  (await db.insert(schema.membershipPurchases).values({ userId: A, tier, billing: "monthly", days, amountCents: cents, paypalOrderId: `ORDER-${++n}` }).returning())[0]!;

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values([{ id: A }]);
});
beforeEach(async () => { await db.delete(schema.membershipBlocks); await db.delete(schema.membershipPurchases); });

it("a first purchase turns the tier on for its days, then it lapses", async () => {
  const p = await buy("plus", 30);
  expect(await S.getTier(A, NOW)).toBe("free");
  expect(await M.grantPurchase(p.id, NOW)).toBe(true);
  expect(await S.getTier(A, new Date(NOW.getTime() + 29 * day))).toBe("plus");
  expect(await S.getTier(A, new Date(NOW.getTime() + 31 * day))).toBe("free");
});

it("granting the same payment twice adds the days once", async () => {
  const p = await buy("plus", 30);
  expect(await M.grantPurchase(p.id, NOW)).toBe(true);
  expect(await M.grantPurchase(p.id, NOW)).toBe(false);
  const blocks = await S.getMembership(A, NOW);
  expect(blocks).toHaveLength(1);
  expect(blocks[0]!.endsAt.getTime() - NOW.getTime()).toBe(30 * day);
});

it("upgrading runs Pro first, then the rest of Plus", async () => {
  await M.grantPurchase((await buy("plus", 30)).id, NOW);
  const later = new Date(NOW.getTime() + 18 * day); // 12 Plus days left
  await M.grantPurchase((await buy("pro", 30, 1500)).id, later);
  const blocks = await S.getMembership(A, later);
  expect(blocks.map((b) => [b.tier, (b.endsAt.getTime() - b.startsAt.getTime()) / day])).toEqual([["pro", 30], ["plus", 12]]);
  expect(await S.getTier(A, new Date(later.getTime() + 31 * day))).toBe("plus");
  expect(await S.getTier(A, new Date(later.getTime() + 43 * day))).toBe("free");
});

it("a refund takes the days back, once", async () => {
  const p = await buy("plus", 30);
  await M.grantPurchase(p.id, NOW);
  expect(await M.revokePurchase(p.id, NOW)).toBe(true);
  expect(await M.revokePurchase(p.id, NOW)).toBe(false);
  expect(await S.getTier(A, NOW)).toBe("free");
  expect((await db.select().from(schema.membershipPurchases).where(eq(schema.membershipPurchases.id, p.id)))[0]!.status).toBe("refunded");
});
