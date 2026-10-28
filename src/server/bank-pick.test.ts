import fs from "node:fs";
import path from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";

vi.mock("./delivery-context", () => ({ deliveryContext: async () => ({ ip: null, device: null }) }));
const pg = new PGlite(), db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
const { pickBankQuestions, parseBankFilters } = await import("./bank-search");
const { internalIds } = await import("./questions");

const U = "00000000-0000-0000-0000-0000000000c1";
const q = (id: string, skillId: string, extra = {}) => ({ id, skillId, section: "math" as const, domain: "m-alg" as const, difficulty: 2, type: "mcq" as const, stemMd: "stem", choices: [{ id: "A", md: "1" }], answer: { choice: "A" }, explanationMd: "e", ...extra });

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values({ id: U });
  await db.insert(schema.questions).values([q("b1", "m-alg-lin1"), q("b2", "m-alg-lin1"), q("b3", "m-alg-lin1"), q("t1", "m-alg-lin1", { pool: "test" })]);
});

it("picks study questions the student has never seen, and their ids resolve afterwards", async () => {
  const ids = await pickBankQuestions(U, parseBankFilters({ skill: "m-alg-lin1", count: "10" }));
  expect(ids).toHaveLength(3);
  expect(await internalIds(ids, U)).toHaveLength(3);
});

it("says so when nothing matches", async () => {
  await expect(pickBankQuestions(U, parseBankFilters({ q: "no such words anywhere" }))).rejects.toThrow(/No questions match/);
});
