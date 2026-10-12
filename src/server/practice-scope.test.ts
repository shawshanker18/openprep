// Adaptive practice with a chosen skill list only ever serves questions from those skills.
import fs from "node:fs";
import path from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";
import { SKILLS } from "@/content/taxonomy";

vi.mock("./delivery-context", () => ({ deliveryContext: async () => ({ ip: null, device: null }) }));
const pg = new PGlite(), db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
const { selectPracticeQuestion } = await import("./practice");

const USER = "00000000-0000-0000-0000-0000000000e1";
const CHOSEN = "m-geo-area", OTHER = "m-alg-lin1";
const profile = { id: USER, timezone: "Asia/Kolkata", grade: 10, curriculum: "cbse", testDate: null, targetScore: null,
  minutesPerDay: 45, daysPerWeek: 5, weeklyFocus: null, chaptersDone: [], topicsStudied: [], subjects: [] } as unknown as schema.Profile;

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values({ id: USER, grade: 10, curriculum: "cbse" });
  await db.insert(schema.skillState).values(SKILLS.map((s) => ({ userId: USER, skillId: s.id })));
  const rows = [CHOSEN, OTHER].flatMap((skill) => {
    const s = SKILLS.find((x) => x.id === skill)!;
    return [1, 2, 3, 4].map((n) => ({
      id: `scope-${skill}-${n}`, skillId: skill, section: s.section, domain: s.domain, difficulty: 2, type: "mcq" as const,
      stemMd: "stem", choices: [{ id: "A", md: "1" }], answer: { choice: "A" }, explanationMd: "e", tags: [], status: "active", pool: "study",
    }));
  });
  await db.insert(schema.questions).values(rows);
}, 120_000);

it("serves only questions from the chosen skills", async () => {
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) {
    const q = await selectPracticeQuestion(USER, profile, { mode: "smart", exclude: [...seen], skillIds: [CHOSEN] });
    expect(q, `question ${i + 1}`).not.toBeNull();
    expect(q!.skillId).toBe(CHOSEN);
    seen.push(q!.id);
  }
});

it("with no skill list, adaptive may draw from any skill", async () => {
  const q = await selectPracticeQuestion(USER, profile, { mode: "smart", exclude: [] });
  expect(q).not.toBeNull();
});

it("returns nothing, not another skill, when the chosen skill has no questions left", async () => {
  // Chosen skill has four questions; excluding all of them must not fall through to another skill.
  const exclude = (await db.select({ id: schema.questions.id }).from(schema.questions).where(
    (await import("drizzle-orm")).eq(schema.questions.skillId, CHOSEN))).map((r) => r.id);
  const q = await selectPracticeQuestion(USER, profile, { mode: "smart", exclude, skillIds: [CHOSEN] });
  expect(q).toBeNull();
});
