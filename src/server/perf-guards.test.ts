// Guards for the dashboard/cron load fixes: cheap early exits, no blocking on decorative stats, indexed skill probe.
import fs from "node:fs";
import path from "node:path";
import { beforeEach, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";

const execute = vi.fn();
const select = vi.fn();
vi.mock("@/db", () => ({ db: { execute, select } }));

beforeEach(() => { execute.mockReset(); vi.resetModules(); });

it("reminder sweep skips the timezone-catalog query when nobody can be due", async () => {
  execute.mockResolvedValueOnce([{ found: false }]);
  const { sendDueReminders } = await import("./push");
  expect(await sendDueReminders()).toEqual({ candidates: 0, sent: 0 });
  expect(execute).toHaveBeenCalledTimes(1);
});

it("reminder sweep still runs the full query when a device has a reminder hour", async () => {
  execute.mockResolvedValueOnce([{ found: true }]).mockResolvedValueOnce([]);
  const { sendDueReminders } = await import("./push");
  expect(await sendDueReminders()).toEqual({ candidates: 0, sent: 0 });
  expect(execute).toHaveBeenCalledTimes(2);
});

it("reminder sweep falls back to the slow timezone-catalog query if the database rejects a stored zone", async () => {
  execute.mockResolvedValueOnce([{ found: true }]).mockRejectedValueOnce(new Error('time zone "Nowhere/Land" not recognized')).mockResolvedValueOnce([]);
  const { sendDueReminders } = await import("./push");
  expect(await sendDueReminders()).toEqual({ candidates: 0, sent: 0 });
  expect(execute).toHaveBeenCalledTimes(3);
});

it("skillsWithQuestions finds exactly the skills that have an active question", { timeout: 60_000 }, async () => {
  const pg = new PGlite();
  const real = drizzle(pg, { schema });
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  const q = (id: string, skillId: string, status: string) => ({
    id, skillId, section: "math", domain: "m-alg", difficulty: 1, type: "mcq", passageMd: null, stemMd: "s", choices: [],
    answer: { choice: "A" }, explanationMd: "", choiceRationales: null, fastMethodMd: null, desmos: null, tags: [], status, version: 1,
  });
  await real.insert(schema.questions).values([
    q("a-1", "m-alg-lin1", "active"), q("a-2", "m-alg-lin1", "active"),
    q("b-1", "m-alg-systems", "active"), q("c-1", "m-geo-area", "retired"), // retired only: not available
  ]);
  select.mockImplementation((...args: Parameters<typeof real.select>) => real.select(...args));
  const { skillsWithQuestions } = await import("./plan");
  expect([...(await skillsWithQuestions())].sort()).toEqual(["m-alg-lin1", "m-alg-systems"]);
});
