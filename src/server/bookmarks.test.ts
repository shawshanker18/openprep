import fs from "node:fs";
import path from "node:path";
import { beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Tx } from "@/db";
import { saveBookmarkNote } from "./bookmarks";

const pg = new PGlite();
const db = drizzle(pg, { schema });
const alice = "00000000-0000-0000-0000-0000000000a1";
const bob = "00000000-0000-0000-0000-0000000000b1";
const questionId = "bookmark-note-question";
const note = async (userId: string) => (await db.select().from(schema.bookmarks).where(and(
  eq(schema.bookmarks.userId, userId), eq(schema.bookmarks.questionId, questionId),
)))[0]?.note;
const save = (userId: string, question: string, text: string) => db.transaction(tx =>
  saveBookmarkNote(userId, question, text, tx as unknown as Tx));

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter(x => x.endsWith(".sql") && !x.startsWith("0001") && !x.startsWith("0015")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values([{ id: alice }, { id: bob }]);
  await db.insert(schema.questions).values({ id: questionId, skillId: "m-alg-lin1", section: "math", domain: "m-alg",
    difficulty: 2, type: "mcq", stemMd: "Question", choices: [{ id: "A", md: "1" }], answer: { choice: "A" }, explanationMd: "Explanation" });
  // An existing bookmark must survive migration, with an empty note rather than a replaced row.
  await pg.query("insert into bookmarks (user_id, question_id) values ($1, $2), ($3, $2)", [alice, questionId, bob]);
  await pg.exec(fs.readFileSync(path.join(dir, "0015_bookmark_notes.sql"), "utf8"));
});

it("preserves existing bookmarks and isolates each student's notes", async () => {
  expect(await note(alice)).toBe("");
  expect(await note(bob)).toBe("");
  expect(await save(alice, questionId, "Remember to divide both sides.\nCheck signs.")).toBe(true);
  expect(await note(alice)).toBe("Remember to divide both sides.\nCheck signs.");
  expect(await note(bob)).toBe("");
  expect(await save(bob, questionId, "My own note")).toBe(true);
  expect(await note(alice)).toContain("Check signs.");
});

it("supports clearing notes and rejects oversized or unowned bookmarks", async () => {
  expect(await save(alice, questionId, "x".repeat(2001))).toBe(false);
  expect(await note(alice)).toContain("Check signs.");
  expect(await save(alice, "not-saved", "No")).toBe(false);
  expect(await save("00000000-0000-0000-0000-0000000000c1", questionId, "No")).toBe(false);
  expect(await save(alice, questionId, "")).toBe(true);
  expect(await note(alice)).toBe("");
  expect(await note(bob)).toBe("My own note");
});
