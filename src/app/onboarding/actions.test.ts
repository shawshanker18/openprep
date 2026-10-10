import fs from "node:fs";
import path from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { SKILLS } from "@/content/taxonomy";

vi.mock("@/server/delivery-context",()=>({deliveryContext:async()=>({ip:null,device:null})}));
const pg = new PGlite();
const db = drizzle(pg, { schema });
const userId = "00000000-0000-0000-0000-000000000001";
vi.mock("@/db", () => ({ db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/auth", () => ({ requireUser: async () => ({ userId, profile: await db.query.profiles.findFirst({ where: eq(schema.profiles.id, userId) }) }) }));
const { submitSurvey } = await import("./actions");

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const statement of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(statement);
  // Existing Supabase projects already have this table from the old manual script.
  // Re-running the migration must be safe there as well as on a fresh database.
  await pg.exec(fs.readFileSync(path.join(dir, "0012_practice_rate_windows.sql"), "utf8"));
  await db.insert(schema.profiles).values({ id: userId });
});

it("allows skipped slides and initializes every skill before the diagnostic without a separate self-assessment", async () => {
  const input = { grade: null, curriculum: null, subjects: [], topicsStudied: [], englishBackground: null, prior: null, targetScore: null, testDate: null, minutesPerDay: 45, daysPerWeek: 5, timezone: "Asia/Dubai", ratings: {} };
  expect((await submitSurvey({ ...input, ratings: { unknown: 3 } })).ok).toBe(false);
  expect(await db.select().from(schema.skillState)).toHaveLength(0);
  expect((await submitSurvey(input)).ok).toBe(true);
  const profile = await db.query.profiles.findFirst({ where: eq(schema.profiles.id, userId) });
  expect(profile).toMatchObject({ onboardingStep: "diagnostic_skipped", grade: null, curriculum: null, englishBackground: null, targetScore: null, testDate: null, minutesPerDay: 45, daysPerWeek: 5 });
  const skills = await db.select().from(schema.skillState);
  expect(skills).toHaveLength(SKILLS.length);
  expect(skills.every((skill) => skill.selfRating === null && Number.isFinite(skill.theta))).toBe(true);
  expect((await submitSurvey(input)).ok).toBe(false);
  expect(await db.select().from(schema.skillState)).toHaveLength(SKILLS.length);
});

it("opens bank, Adaptive Practice, daily plan, reviews and short tests without any diagnostic", async () => {
  const A = await import("@/app/(app)/practice/actions");
  const { createPaper } = await import("@/server/papers");
  const { getDashboard, isMockDue } = await import("@/server/daily");
  const { getNotifications } = await import("@/server/notifications");
  const { startTestAction } = await import("@/app/(app)/tests/actions");
  const { redirect } = await import("next/navigation");
  const skill = SKILLS.find((s) => s.section === "math")!;
  await db.insert(schema.questions).values(Array.from({ length: 12 }, (_, i) => ({
    id: `${skill.id}-demo-${i}`, skillId: skill.id, section: skill.section, domain: skill.domain, difficulty: 2,
    type: "mcq" as const, stemMd: "Solve 2x = 4.", choices: [{ id: "A", md: "2" }, { id: "B", md: "4" }], answer: { choice: "A" }, explanationMd: "Divide both sides by 2 to get x = 2.",
  })));
  const profile = (await db.query.profiles.findFirst({ where: eq(schema.profiles.id, userId) }))!;
  const served = await A.nextQuestion({ paperId: await createPaper(userId, { mode: "smart" }), exclude: [] });
  expect(served).toMatchObject({ ok: true });
  if (!served.ok || "done" in served.data) throw new Error("Smart Practice did not serve a question");
  await db.update(schema.questionServes).set({servedAt:new Date(Date.now()-6000)});
  const answered = await A.submitAnswer({ questionId: served.data.question.id, response: "B", timeMs: 5000, confidence: 3 });
  expect(answered.ok).toBe(true);
  const state = await db.query.skillState.findFirst({ where: eq(schema.skillState.skillId, skill.id) });
  expect(state?.n).toBe(1);
  expect(await db.select().from(schema.attempts).where(and(eq(schema.attempts.userId, userId), eq(schema.attempts.correct, false)))).toHaveLength(1);
  const dashboard = await getDashboard(userId, profile);
  expect(dashboard.blocks.length).toBeGreaterThan(0);
  // A missed question must still generate a review notification after skipping the diagnostic.
  await db.update(schema.reviewItems).set({ dueAt: new Date(Date.now() - 1000) });
  expect((await getNotifications(userId, profile)).some((n) => n.id === "reviews")).toBe(true);
  expect((await isMockDue(userId, null)).due).toBe(false);
  expect((await isMockDue(userId, null, new Date(Date.now() + 8 * 86_400_000))).due).toBe(true);
  const { PAPERS, paperOf } = await import("@/engine/paper");
  const paper = PAPERS.find((n) => Array.from({ length: 12 }, (_, i) => `${skill.id}-demo-${i}`).some((id) => paperOf(id) === n))!;
  const form = new FormData(); form.set("scope", "math:base"); form.set("paper", String(paper));
  await startTestAction(form);
  expect(redirect).toHaveBeenLastCalledWith(expect.stringMatching(/^\/test\//));
  expect((await db.select().from(schema.testSessions)).some((session) => session.kind === "diagnostic")).toBe(false);
});
