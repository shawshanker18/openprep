// Question bank search: applies the filters in one indexed query. Only active study questions are listed;
// test-pool questions stay out of practice and browsing (docs/QUESTION_POOLS.md).
import "server-only";
import { and, count, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { attempts, bookmarks, questions } from "@/db/schema";
import { SKILLS, type DomainId, type Section } from "@/content/taxonomy";
import { deliveryContext } from "./delivery-context";
import { eventQuota, exposeQuestions, lockDelivery } from "./delivery";
import { DeliveryBlocked } from "./delivery-policy";
import { availableQuestion } from "./question-availability";
import { publicId } from "./questions";
import { likeEscape, previewText, type BankFilters } from "@/lib/bank-filters";

export * from "@/lib/bank-filters";
export const PER_PAGE = 20;

/** Filter clauses for the given user. Pure apart from the SQL it builds, so tests can check the text. */
export function bankWhere(userId: string, f: BankFilters): SQL {
  const matchingSkills = f.q
    ? SKILLS.filter((s) => s.name.toLowerCase().includes(f.q.toLowerCase())).map((s) => s.id)
    : [];
  const text = f.q ? `%${likeEscape(f.q)}%` : null;
  const attempted = sql`exists (select 1 from ${attempts} where ${attempts.userId} = ${userId}::uuid and ${attempts.questionId} = ${sql.raw('"questions"."id"')})`;
  const missed = sql`exists (select 1 from ${attempts} where ${attempts.userId} = ${userId}::uuid and ${attempts.questionId} = ${sql.raw('"questions"."id"')} and ${attempts.correct} = false)`;
  const saved = sql`exists (select 1 from ${bookmarks} where ${bookmarks.userId} = ${userId}::uuid and ${bookmarks.questionId} = ${sql.raw('"questions"."id"')})`;
  return and(
    eq(questions.status, "active"),
    eq(questions.pool, "study"),
    f.subject ? eq(questions.section, f.subject) : undefined,
    f.domains.length ? inArray(questions.domain, f.domains) : undefined,
    f.skills.length ? inArray(questions.skillId, f.skills) : undefined,
    f.difficulties.length < 3 ? inArray(questions.difficulty, f.difficulties) : undefined,
    text ? or(
      ilike(questions.stemMd, text),
      ilike(sql`coalesce(${questions.passageMd}, '')`, text),
      ilike(sql`${questions.tags}::text`, text),
      matchingSkills.length ? inArray(questions.skillId, matchingSkills) : undefined,
    ) : undefined,
    f.status === "unattempted" ? sql`not ${attempted}` : undefined,
    f.status === "attempted" ? attempted : undefined,
    f.status === "missed" ? missed : undefined,
    f.saved ? saved : undefined,
  )!;
}

export type BankRow = {
  id: string; skillId: string; domain: DomainId; section: Section; difficulty: 1 | 2 | 3;
  /** The start of the stem, as markdown (math is rendered by the page). Answers and explanations are never selected. */
  stem: string; preview: string; attempted: boolean; missed: boolean; saved: boolean;
};


export async function searchBank(userId: string, f: BankFilters, client: Pick<typeof db, "select"> = db) {
  const where = bankWhere(userId, f);
  const [countRow] = await client.select({ total: count() }).from(questions).where(where);
  const total = countRow?.total ?? 0;
  const rows = await client.select({
    id: questions.id, skillId: questions.skillId, domain: questions.domain, section: questions.section,
    difficulty: questions.difficulty, stemMd: questions.stemMd,
    attempted: sql<boolean>`exists (select 1 from ${attempts} where ${attempts.userId} = ${userId}::uuid and ${attempts.questionId} = ${sql.raw('"questions"."id"')})`,
    missed: sql<boolean>`exists (select 1 from ${attempts} where ${attempts.userId} = ${userId}::uuid and ${attempts.questionId} = ${sql.raw('"questions"."id"')} and ${attempts.correct} = false)`,
    saved: sql<boolean>`exists (select 1 from ${bookmarks} where ${bookmarks.userId} = ${userId}::uuid and ${bookmarks.questionId} = ${sql.raw('"questions"."id"')})`,
  }).from(questions).where(where)
    .orderBy(questions.skillId, questions.difficulty, questions.id)
    .limit(PER_PAGE).offset((f.page - 1) * PER_PAGE);
  const out: BankRow[] = rows.map((r) => ({
    id: r.id, skillId: r.skillId, domain: r.domain as DomainId, section: r.section as Section,
    difficulty: r.difficulty as 1 | 2 | 3, stem: r.stemMd.slice(0, 400), preview: previewText(r.stemMd),
    attempted: !!r.attempted, missed: !!r.missed, saved: !!r.saved,
  }));
  return { total, pages: Math.max(1, Math.ceil(total / PER_PAGE)), rows: out };
}

/**
 * "Practice" in the question bank: picks up to `count` questions matching the filters that this student can open now,
 * marks them as delivered to this account (so their hashed ids resolve), and returns those ids in order.
 * Questions in the student's other open sessions or tests are skipped here instead of failing later.
 */
export async function pickBankQuestions(userId: string, f: BankFilters) {
  const context = await deliveryContext();
  await eventQuota(userId, context, "set");
  return db.transaction(async (tx) => {
    await lockDelivery(tx, userId, context);
    const rows = await tx.select({ id: questions.id, skillId: questions.skillId }).from(questions)
      .where(and(bankWhere(userId, f), availableQuestion(userId))).orderBy(sql`random()`).limit(f.count);
    if (!rows.length) throw new DeliveryBlocked("No questions match these filters, or you already have them open in another session. Try broader filters.");
    await exposeQuestions(tx, userId, rows, context);
    return rows.map((r) => publicId(r.id, userId));
  });
}
