import "server-only";
import { createHash } from "node:crypto";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { questionRemixes, questions, remixUsage, type Question } from "@/db/schema";
import { canRemix, REMIX, type Tier } from "@/lib/tiers";
import { canSwapNumbers, hasFigure, remixDifficulty, type Direction } from "@/lib/remix";
import { consumeWindow } from "./delivery";
import { DeliveryBlocked } from "./delivery-policy";
import { generateRemix, type RemixDraft } from "./remix-model";

/** A message that is safe to show the student. */
export class RemixError extends Error {}

export const remixId = (sourceId: string, direction: Direction) =>
  `rmx-${createHash("sha256").update(`${sourceId}:${direction}`).digest("hex").slice(0, 20)}`;

const monthStart = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

/** Reserve one fresh generation, or throw. Serialised per user so two tabs cannot both take the last credit. */
export async function reserveCredit(tx: Tx, userId: string, tier: Tier, now = new Date()) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`remix:${userId}`}))`);
  const since = (ms: number) => new Date(now.getTime() - ms);
  const used = async (from: Date, user?: string) =>
    (await tx.select({ n: count() }).from(remixUsage).where(and(gte(remixUsage.createdAt, from), user ? eq(remixUsage.userId, user) : undefined)))[0]!.n;
  if (tier === "plus") {
    if (await used(monthStart(now), userId) >= REMIX.monthlyCredits.plus)
      throw new RemixError(`You've used all ${REMIX.monthlyCredits.plus} remixes this month. Remixes other students already made are still free.`);
  } else if (tier === "pro") {
    if (await used(since(3_600_000), userId) >= REMIX.proPerHour || await used(since(86_400_000), userId) >= REMIX.proPerDay)
      throw new RemixError("You're remixing very fast. Please wait a little and try again. Remixes already made are still instant.");
  }
  if (await used(since(86_400_000)) >= REMIX.globalPerDay) throw new RemixError("Remixing is very busy right now. Please try again later.");
  const [row] = await tx.insert(remixUsage).values({ userId, createdAt: now }).returning({ id: remixUsage.id });
  return row!.id;
}

export async function creditsLeft(userId: string, tier: Tier, now = new Date()) {
  if (tier !== "plus") return null;
  const [r] = await db.select({ n: count() }).from(remixUsage).where(and(eq(remixUsage.userId, userId), gte(remixUsage.createdAt, monthStart(now))));
  return Math.max(0, REMIX.monthlyCredits.plus - r!.n);
}

/** Every remix request, saved or fresh: a cheap per-minute brake against scripts. */
export async function limitRemixRequests(userId: string) {
  try { await db.transaction((tx) => consumeWindow(tx, `remix:user:${userId}`, REMIX.requestsPerMinute, 60_000)); }
  catch (e) { if (e instanceof DeliveryBlocked) throw new RemixError("Too many remix requests. Please wait a minute."); throw e; }
}

const inflight = new Map<string, Promise<void>>();

type Generate = (source: Question, direction: Direction) => Promise<RemixDraft>;

/** Returns the id of the shared remix of `sourceId`, generating it (and charging a credit) only when nobody has yet. */
export async function getOrCreateRemix(userId: string, tier: Tier, sourceId: string, direction: Direction, generate: Generate = generateRemix): Promise<string> {
  if (!canRemix(tier)) throw new RemixError("Remixing is part of Plus and Pro.");
  const [source] = await db.select().from(questions).where(eq(questions.id, sourceId));
  if (!source || source.status !== "active") throw new RemixError("Question not found.");

  if (hasFigure(source)) throw new RemixError("Questions with a figure or diagram can't be remixed.");
  if (direction === "numbers" && !canSwapNumbers(source)) throw new RemixError("Swapping numbers only works on math questions with numbers in the text.");

  const [saved] = await db.select({ id: questionRemixes.remixId }).from(questionRemixes)
    .where(and(eq(questionRemixes.sourceId, sourceId), eq(questionRemixes.direction, direction)));
  if (saved) return saved.id;

  const id = remixId(sourceId, direction);
  const creditId = await db.transaction((tx) => reserveCredit(tx, userId, tier));
  const refund = () => db.delete(remixUsage).where(eq(remixUsage.id, creditId));
  // A second tab or student asking for the same remix waits for the first generation instead of paying for another.
  const running = inflight.get(id);
  if (running) { await refund(); await running; return id; }
  const work = (async () => {
    let draft: RemixDraft;
    try { draft = await generate(source, direction); }
    catch (e) {
      console.warn("Remix generation failed", e instanceof Error ? e.message : e);
      await refund();
      throw new RemixError("Couldn't make that remix right now. You weren't charged. Please try again.");
    }
    const won = await db.transaction(async (tx) => {
      await tx.insert(questions).values({
        ...draft, id, skillId: source.skillId, section: source.section, domain: source.domain,
        difficulty: remixDifficulty(source.difficulty, direction), type: source.type, fastMethodMd: null, desmos: null, tags: source.tags,
        status: "active", version: 1, pool: "remix",
      }).onConflictDoNothing();
      const r = await tx.insert(questionRemixes).values({ sourceId, direction, remixId: id, createdBy: userId })
        .onConflictDoNothing().returning({ id: questionRemixes.remixId });
      return r.length > 0;
    });
    if (!won) await refund(); // someone saved it first (another server): theirs stands, and this one was free
  })();
  inflight.set(id, work);
  try { await work; } finally { inflight.delete(id); }
  return id;
}

/** What a remix page shows above the question: "Harder remix of question 4f2a". */
export async function remixOrigin(remixIdValue: string) {
  const [r] = await db.select({ sourceId: questionRemixes.sourceId, direction: questionRemixes.direction }).from(questionRemixes).where(eq(questionRemixes.remixId, remixIdValue));
  return r ?? null;
}
