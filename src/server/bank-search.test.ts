// Question bank: parsing and normalising filters, plus the search itself against real Postgres (PGlite).
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";
import { bankQuery, activeFilterCount, likeEscape, parseBankFilters, PER_PAGE, previewText, searchBank } from "./bank-search";

vi.mock("@/db", () => ({ db: {} }));

describe("parseBankFilters", () => {
  it("defaults to everything", () => {
    const f = parseBankFilters({});
    expect(f).toMatchObject({ q: "", subject: null, domains: [], skills: [], difficulties: [1, 2, 3], status: "any", saved: false, page: 1 });
    expect(activeFilterCount(f)).toBe(0);
  });

  it("drops unknown values rather than guessing", () => {
    const f = parseBankFilters({ subject: "science", domain: "nope", skill: "constructor", difficulties: "9,x", status: "all", page: "-4" });
    expect(f).toMatchObject({ subject: null, domains: [], skills: [], difficulties: [1, 2, 3], status: "any", page: 1 });
  });

  it("a skill sets the subject when it is the only choice", () => {
    expect(parseBankFilters({ skill: "m-alg-lin1" })).toMatchObject({ subject: "math", domains: [], skills: ["m-alg-lin1"] });
    expect(parseBankFilters({ skill: "rw-cs-words" })).toMatchObject({ subject: "rw", skills: ["rw-cs-words"] });
  });

  it("clears a topic that belongs to the other subject", () => {
    expect(parseBankFilters({ subject: "rw", domain: "m-alg" })).toMatchObject({ subject: "rw", domains: [] });
    expect(parseBankFilters({ subject: "math", domain: "m-alg" })).toMatchObject({ subject: "math", domains: ["m-alg"] });
  });

  it("clears a skill that is not under any chosen topic", () => {
    const f = parseBankFilters({ domain: "rw-cs", skill: "m-alg-lin1" });
    expect(f.domains).toEqual(["rw-cs"]);
    expect(f.skills).toEqual([]);
  });

  it("keeps a skill that sits under a chosen topic", () => {
    expect(parseBankFilters({ domain: "m-alg", skill: "m-alg-lin1" })).toMatchObject({ domains: ["m-alg"], skills: ["m-alg-lin1"] });
  });

  it("accepts several topics and several skills, from repeated or comma-separated parameters", () => {
    const repeated = parseBankFilters({ domain: ["m-alg", "m-psda"], skill: ["m-alg-lin1", "m-psda-ratios"] });
    expect(repeated.domains).toEqual(["m-alg", "m-psda"]);
    expect(repeated.skills).toEqual(["m-alg-lin1", "m-psda-ratios"]);
    const comma = parseBankFilters({ domain: "m-alg,m-psda", skill: "m-alg-lin1,m-psda-ratios" });
    expect(comma.domains).toEqual(["m-alg", "m-psda"]);
    expect(comma.skills).toEqual(["m-alg-lin1", "m-psda-ratios"]);
  });

  it("drops unknown topics and skills", () => {
    const f = parseBankFilters({ domain: ["m-alg", "nope"], skill: ["m-alg-lin1", "constructor"] });
    expect(f.domains).toEqual(["m-alg"]);
    expect(f.skills).toEqual(["m-alg-lin1"]);
  });

  it("dedupes and sorts difficulties", () => {
    expect(parseBankFilters({ difficulties: "3,1,3" }).difficulties).toEqual([1, 3]);
  });

  it("reads one parameter per checkbox, as the filter form sends them", () => {
    expect(parseBankFilters({ difficulties: ["1", "2"] }).difficulties).toEqual([1, 2]);
    expect(parseBankFilters({ difficulties: ["3"] }).difficulties).toEqual([3]);
  });

  it("caps the search text", () => {
    expect(parseBankFilters({ q: "  " + "x".repeat(300) }).q).toHaveLength(100);
  });
});

describe("bankQuery", () => {
  it("round-trips the filters and leaves out defaults", () => {
    const f = parseBankFilters({ q: "rate & ratio", subject: "math", domain: ["m-psda", "m-alg"], skill: "m-psda-ratios", difficulties: "2", status: "missed", saved: "1", page: "3" });
    const qs = bankQuery(f);
    const back = parseBankFilters(Object.fromEntries(new URLSearchParams(qs.slice(1))));
    expect(back.q).toBe("rate & ratio");
    expect(back.domains).toEqual(["m-psda", "m-alg"]);
    expect(back.skills).toEqual(["m-psda-ratios"]);
    expect(qs).toContain("difficulties=2");
    expect(qs).not.toContain("page=");
    expect(bankQuery(f, { keepPage: true })).toContain("page=3");
  });
  it("is empty when nothing is set", () => {
    expect(bankQuery(parseBankFilters({}))).toBe("");
  });
});

describe("helpers", () => {
  it("escapes LIKE wildcards", () => {
    expect(likeEscape("100% a_b\\c")).toBe("100\\% a\\_b\\\\c");
  });
  it("previews plain text without the answer, math delimiters or markdown", () => {
    expect(previewText("**Solve** for $x$: $$\\frac{1}{2}$$ and `code`")).toBe("Solve for ⋯: ⋯ and code");
    expect(previewText("a".repeat(300), 20)).toHaveLength(20);
  });
});

// ---- integration against real Postgres ----
const pg = new PGlite();
const db = drizzle(pg, { schema });
const ME = "00000000-0000-0000-0000-00000000b0b1";
const OTHER = "00000000-0000-0000-0000-00000000b0b2";
const q = (id: string, skillId: string, domain: string, section: string, difficulty: number, stem: string, status = "active", pool = "study") =>
  ({ id, skillId, domain, section, difficulty, type: "mcq", stemMd: stem, passageMd: null, choices: [], answer: { choice: "A" },
     explanationMd: "e", choiceRationales: null, fastMethodMd: null, desmos: null, tags: [], status, version: 1, pool }) as schema.Question;

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values([{ id: ME }, { id: OTHER }]);
  const rows: schema.Question[] = [
    q("bq-1", "m-alg-lin1", "m-alg", "math", 1, "Solve for x: 2x + 3 = 7"),
    q("bq-2", "m-alg-lin1", "m-alg", "math", 2, "A line passes through the origin with slope 4"),
    q("bq-3", "m-psda-ratios", "m-psda", "math", 3, "A recipe uses a ratio of 3 to 5"),
    q("bq-4", "rw-cs-words", "rw-cs", "rw", 1, "Choose the word that best fits the context"),
    q("bq-retired", "m-alg-lin1", "m-alg", "math", 1, "Retired question about 2x", "retired"),
    q("bq-test", "m-alg-lin1", "m-alg", "math", 1, "Mock test item about 2x", "active", "test"),
  ];
  for (let i = 0; i < 25; i++) rows.push(q(`bq-pg-${String(i).padStart(2, "0")}`, "m-adv-equiv", "m-adv", "math", 2, `Paged question ${i}`));
  await db.insert(schema.questions).values(rows);
  await db.insert(schema.attempts).values([
    { userId: ME, questionId: "bq-1", skillId: "m-alg-lin1", context: "practice", response: "A", correct: true, timeMs: 30000, thetaBefore: 0, thetaAfter: 0 },
    { userId: ME, questionId: "bq-2", skillId: "m-alg-lin1", context: "practice", response: "B", correct: false, timeMs: 30000, thetaBefore: 0, thetaAfter: 0 },
    { userId: OTHER, questionId: "bq-3", skillId: "m-psda-ratios", context: "practice", response: "B", correct: false, timeMs: 30000, thetaBefore: 0, thetaAfter: 0 },
  ]);
  await db.insert(schema.bookmarks).values({ userId: ME, questionId: "bq-4" });
}, 120_000);

const run = (qs: Record<string, string | string[]>) => searchBank(ME, parseBankFilters(qs), db as never);

describe("searchBank", () => {
  it("lists only active study questions", async () => {
    const r = await run({});
    expect(r.rows.map((x) => x.id)).not.toContain("bq-retired");
    expect(r.rows.map((x) => x.id)).not.toContain("bq-test");
    expect(r.total).toBe(4 + 25);
  });

  it("filters by subject, topic and skill, which combine", async () => {
    expect((await run({ subject: "rw" })).rows.map((x) => x.id)).toEqual(["bq-4"]);
    expect((await run({ subject: "math", domain: "m-alg" })).total).toBe(2);
    expect((await run({ domain: ["m-alg", "m-psda"] })).total).toBe(2 + 1);
    expect((await run({ domain: "m-alg", skill: ["m-alg-lin1", "m-alg-linfunc"] })).total).toBe(2);
    expect((await run({ skill: "m-alg-lin1", difficulties: "2" })).rows.map((x) => x.id)).toEqual(["bq-2"]);
  });

  it("searches question text and skill names", async () => {
    expect((await run({ q: "slope" })).rows.map((x) => x.id)).toEqual(["bq-2"]);
    expect((await run({ q: "words" })).rows.map((x) => x.id)).toEqual(["bq-4"]);
    expect((await run({ q: "100%" })).total).toBe(0);
  });

  it("reports attempt status for this student only", async () => {
    const attempted = await run({ status: "attempted" });
    expect(attempted.rows.map((x) => x.id).sort()).toEqual(["bq-1", "bq-2"]);
    expect((await run({ status: "missed" })).rows.map((x) => x.id)).toEqual(["bq-2"]);
    // bq-3 was answered by another student, so it must still be unattempted for this one.
    expect((await run({ status: "unattempted", subject: "math", domain: "m-psda" })).total).toBe(1);
  });

  it("filters saved questions", async () => {
    const r = await run({ saved: "1" });
    expect(r.rows.map((x) => x.id)).toEqual(["bq-4"]);
    expect(r.rows[0]!.saved).toBe(true);
  });

  it("pages in fixed sizes and never repeats a question across pages", async () => {
    const p1 = await run({ subject: "math", skill: "m-adv-equiv", page: "1" });
    const p2 = await run({ subject: "math", skill: "m-adv-equiv", page: "2" });
    expect(p1.rows).toHaveLength(PER_PAGE);
    expect(p2.rows).toHaveLength(5);
    expect(p1.pages).toBe(2);
    expect(new Set([...p1.rows, ...p2.rows].map((x) => x.id)).size).toBe(25);
  });

  it("returns a sensible page count for an empty result", async () => {
    const r = await run({ q: "no such words anywhere" });
    expect(r).toMatchObject({ total: 0, pages: 1, rows: [] });
  });
});

describe("links from results into practice", () => {
  it("passes ids the practice page accepts: public ids, 22 characters of word characters and dashes", async () => {
    const { publicId } = await import("./questions");
    const accepted = /^[\w-]{22}$/; // the same check app/(app)/practice/page.tsx applies to list mode
    expect(publicId("m-alg-ineq-0002", ME)).toMatch(accepted);
    expect("m-alg-ineq-0002").not.toMatch(accepted);
  });
});
