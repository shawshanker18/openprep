// an unauthorized user cannot change rules, and nothing is written when they try.
import fs from "node:fs";
import path from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { count } from "drizzle-orm";
import * as schema from "@/db/schema";

const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
// requireAdmin behaves as in production: a non-admin gets notFound() before anything else runs.
vi.mock("@/server/admin", () => ({
  requireAdmin: async () => { const e = new Error("NEXT_NOT_FOUND"); throw e; },
  audit: async () => { throw new Error("audit must not run for a non-admin"); },
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT ${u}`); }, notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { saveRuleAction, setRuleStatusAction, saveVersionAction } = await import("@/app/admin/assignments/actions");

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.courseVersions).values({ id: "v1", courseId: "c", name: "v1", status: "published" });
}, 120_000);

const form = (fields: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.set(k, v); return f; };
const counts = async () => ({
  rules: (await db.select({ n: count() }).from(schema.assignmentRules))[0]!.n,
  versions: (await db.select({ n: count() }).from(schema.courseVersions))[0]!.n,
  history: (await db.select({ n: count() }).from(schema.assignmentHistory))[0]!.n,
});

it("a non-admin cannot save a rule, and the database is untouched", async () => {
  const before = await counts();
  await expect(saveRuleAction(form({ name: "Sneaky", status: "live", priority: "9999", targetVersionId: "v1", op: "all", chapter0: "cbse-9-polynomials" })))
    .rejects.toThrow(/NEXT_NOT_FOUND/);
  expect(await counts()).toEqual(before);
});

it("a non-admin cannot publish a rule", async () => {
  await expect(setRuleStatusAction(form({ id: "00000000-0000-4000-8000-00000000ffff", status: "live" }))).rejects.toThrow(/NEXT_NOT_FOUND/);
});

it("a non-admin cannot change the fallback version", async () => {
  const before = await counts();
  await expect(saveVersionAction(form({ id: "v1", courseId: "c", name: "v1", status: "published", isFallback: "on" }))).rejects.toThrow(/NEXT_NOT_FOUND/);
  expect(await counts()).toEqual(before);
});
