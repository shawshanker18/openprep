import fs from "node:fs";
import path from "node:path";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { REMIX } from "@/lib/tiers";

vi.mock("./delivery-context", () => ({ deliveryContext: async () => ({ ip: null, device: null }) }));
const pg = new PGlite(), db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
const R = await import("./remix");

const A = "00000000-0000-0000-0000-0000000000a1", B = "00000000-0000-0000-0000-0000000000b2";
const SRC = "remix-src-1";
const draft = { passageMd: null, stemMd: "A different question stem about lines?", choices: [{ id: "A", md: "1" }, { id: "B", md: "2" }, { id: "C", md: "3" }, { id: "D", md: "4" }], answer: { choice: "B" }, explanationMd: "Because two.", choiceRationales: null };
const gen = vi.fn(async () => draft);

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values([{ id: A }, { id: B }]);
  await db.insert(schema.questions).values([
    { id: SRC, skillId: "m-alg-lin1", section: "math", domain: "m-alg", difficulty: 2, type: "mcq", stemMd: "stem", choices: [{ id: "A", md: "1" }], answer: { choice: "A" }, explanationMd: "e" },
    { id: "remix-src-img", skillId: "m-alg-lin1", section: "math", domain: "m-alg", difficulty: 2, type: "mcq", stemMd: "see asset://fig1", choices: [{ id: "A", md: "1" }], answer: { choice: "A" }, explanationMd: "e" },
  ]);
});
beforeEach(async () => {
  gen.mockClear();
  await db.delete(schema.remixUsage);
  await db.delete(schema.questionRemixes);
  await db.delete(schema.questions).where(eq(schema.questions.pool, "remix"));
});

const used = async () => (await db.select().from(schema.remixUsage)).length;

it("free users cannot remix", async () => {
  await expect(R.getOrCreateRemix(A, "free", SRC, "harder", gen)).rejects.toThrow(/Plus and Pro/);
  expect(gen).not.toHaveBeenCalled();
});

it("saves a remix for everyone: the second student gets it free, without the model", async () => {
  const id = await R.getOrCreateRemix(A, "plus", SRC, "harder", gen);
  expect(id).toBe(R.remixId(SRC, "harder"));
  const [row] = await db.select().from(schema.questions).where(eq(schema.questions.id, id));
  expect(row).toMatchObject({ pool: "remix", difficulty: 3, skillId: "m-alg-lin1", status: "active" });
  expect(await R.remixOrigin(id)).toEqual({ sourceId: SRC, direction: "harder" });
  expect(await R.getOrCreateRemix(B, "pro", SRC, "harder", gen)).toBe(id);
  expect(gen).toHaveBeenCalledTimes(1);
  expect(await used()).toBe(1);
});

it("each direction is its own remix, with clamped difficulty", async () => {
  const easier = await R.getOrCreateRemix(A, "plus", SRC, "easier", gen), same = await R.getOrCreateRemix(A, "plus", SRC, "same", gen);
  expect(new Set([easier, same]).size).toBe(2);
  const rows = await db.select({ id: schema.questions.id, d: schema.questions.difficulty }).from(schema.questions).where(eq(schema.questions.pool, "remix"));
  expect(Object.fromEntries(rows.map((r) => [r.id, r.d]))).toEqual({ [easier]: 1, [same]: 2 });
});

it("two simultaneous requests generate once and charge once", async () => {
  const ids = await Promise.all([R.getOrCreateRemix(A, "plus", SRC, "same", gen), R.getOrCreateRemix(B, "plus", SRC, "same", gen)]);
  expect(ids[0]).toBe(ids[1]);
  expect(gen).toHaveBeenCalledTimes(1);
  expect(await used()).toBe(1);
});

it("a failed generation is not charged", async () => {
  const bad = vi.fn(async () => { throw new Error("boom"); });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  await expect(R.getOrCreateRemix(A, "plus", SRC, "same", bad)).rejects.toThrow(/weren't charged/);
  expect(await used()).toBe(0);
  expect(await db.select().from(schema.questionRemixes)).toHaveLength(0);
});

it("Plus stops at its monthly credits, but saved remixes stay free", async () => {
  await R.getOrCreateRemix(B, "pro", SRC, "same", gen);
  await db.delete(schema.remixUsage);
  await db.insert(schema.remixUsage).values(Array.from({ length: REMIX.monthlyCredits.plus }, () => ({ userId: A })));
  await expect(R.getOrCreateRemix(A, "plus", SRC, "harder", gen)).rejects.toThrow(/used all 50/);
  expect(await R.getOrCreateRemix(A, "plus", SRC, "same", gen)).toBe(R.remixId(SRC, "same"));
  expect(await R.creditsLeft(A, "plus")).toBe(0);
});

it("Pro is unlimited per month but capped per hour", async () => {
  await db.insert(schema.remixUsage).values(Array.from({ length: REMIX.proPerHour }, () => ({ userId: A })));
  await expect(R.getOrCreateRemix(A, "pro", SRC, "harder", gen)).rejects.toThrow(/very fast/);
  expect(await R.creditsLeft(A, "pro")).toBeNull();
});

it("the global daily cap stops everyone", async () => {
  await db.insert(schema.remixUsage).values(Array.from({ length: REMIX.globalPerDay }, () => ({ userId: B })));
  await expect(R.getOrCreateRemix(A, "pro", SRC, "harder", gen)).rejects.toThrow(/very busy/);
});

it("remixes a remix", async () => {
  const id = await R.getOrCreateRemix(A, "plus", SRC, "harder", gen);
  const again = await R.getOrCreateRemix(A, "plus", id, "easier", gen);
  expect(again).not.toBe(id);
  expect(await R.remixOrigin(again)).toEqual({ sourceId: id, direction: "easier" });
});

it("never remixes questions with a figure", async () => {
  await expect(R.getOrCreateRemix(A, "plus", "remix-src-img", "easier", gen)).rejects.toThrow(/figure/);
  expect(gen).not.toHaveBeenCalled();
});

it("swaps numbers only on math questions with numbers in the text", async () => {
  await db.insert(schema.questions).values({ id: "remix-src-rw", skillId: "m-alg-lin1", section: "rw", domain: "m-alg", difficulty: 2, type: "mcq", stemMd: "Which word fits 2 blanks?", choices: [{ id: "A", md: "1" }], answer: { choice: "A" }, explanationMd: "e" });
  await expect(R.getOrCreateRemix(A, "plus", "remix-src-rw", "numbers", gen)).rejects.toThrow(/math questions/);
  const id = await R.getOrCreateRemix(A, "plus", SRC, "numbers", gen);
  expect(await db.select({ d: schema.questions.difficulty }).from(schema.questions).where(eq(schema.questions.id, id))).toEqual([{ d: 2 }]);
});

it("rate limits remix requests per minute", async () => {
  for (let i = 0; i < REMIX.requestsPerMinute; i++) await R.limitRemixRequests(A);
  await expect(R.limitRemixRequests(A)).rejects.toThrow(/Too many/);
});
