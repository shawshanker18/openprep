// Question bank and list-mode practice against real Postgres (PGlite).
import fs from "node:fs";
import path from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";
import { SKILLS } from "@/content/taxonomy";

const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
const P = await import("./practice");

const USER = "00000000-0000-0000-0000-0000000000cc";
const skill = SKILLS.find((k) => k.section === "math")!;
const ids = ["qa", "qb", "qc"].map((x) => `${skill.id}-${x}`);

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values({ id: USER });
  await db.insert(schema.skillState).values(SKILLS.map((s) => ({ userId: USER, skillId: s.id })));
  await db.insert(schema.questions).values(ids.map((id) => ({ id, skillId: skill.id, section: "math" as const, domain: skill.domain, difficulty: 2,
    type: "mcq" as const, passageMd: null, stemMd: "s", choices: [], answer: { choice: "A" }, explanationMd: "e", choiceRationales: null,
    fastMethodMd: null, desmos: null, tags: [], status: "active" as const, version: 1 })));
});

it("list mode walks the given ids in order, and the bank shows last result and saved flag", async () => {
  const profile = {} as schema.Profile; // list mode never reads the profile
  const order = [ids[1]!, ids[0]!];
  const first = await P.nextQuestion(USER, profile, { mode: "list", ids: order, exclude: [] });
  expect(first?.question.id).toBe(ids[1]);
  await P.submitAnswer(USER, { questionId: ids[1]!, response: "A", timeMs: 5000, confidence: 2 });
  expect((await P.nextQuestion(USER, profile, { mode: "list", ids: order, exclude: [ids[1]!] }))?.question.id).toBe(ids[0]);
  expect(await P.nextQuestion(USER, profile, { mode: "list", ids: order, exclude: order })).toBeNull();

  await db.insert(schema.bookmarks).values({ userId: USER, questionId: ids[2]! });
  const bank = Object.fromEntries((await P.questionBank(USER)).map((q) => [q.id, q]));
  expect(bank[ids[1]!]).toMatchObject({ status: "correct", saved: false });
  expect(bank[ids[0]!]).toMatchObject({ status: "new", saved: false });
  expect(bank[ids[2]!]).toMatchObject({ status: "new", saved: true });
});
