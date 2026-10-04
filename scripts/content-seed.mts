// Upserts content/questions into the DB; retires (never deletes) questions removed from files (spec 02 §8).
// Runs in the Vercel build, so merging a content PR publishes it.
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { questions } from "../src/db/schema";
import { validateContent } from "./content-validate";

const { errors, rows } = validateContent();
if (errors.length) {
  for (const e of errors) console.error(`error ${e}`);
  process.exit(1);
}

const client = postgres(process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL!, { prepare: false, max: 1 });
const db = drizzle(client);
let inserted = 0, updated = 0;
const retired = 0;

await db.transaction(async (tx) => {
  for (let i = 0; i < rows.length; i += 500) {
    const res = await tx.insert(questions).values(rows.slice(i, i + 500).map((row) => ({ ...row, status: "retired" as const }))).onConflictDoUpdate({
      target: questions.id,
      set: Object.fromEntries(
        ["skill_id", "section", "domain", "difficulty", "type", "passage_md", "stem_md", "choices", "answer",
          "explanation_md", "choice_rationales", "fast_method_md", "desmos", "tags", "status", "version"]
          .map((c) => [c.replace(/_([a-z])/g, (_, x: string) => x.toUpperCase()), sql.raw(`excluded.${c}`)]),
      ),
    }).returning({ isNew: sql<boolean>`(xmax = 0)` });
    for (const r of res) if (r.isNew) inserted++; else updated++;
  }
  // The private SAT import is managed separately from repository content.
  // Never retire imported UUID rows during a Vercel build.
});

const figs = path.resolve(import.meta.dirname, "..", "content", "figures");
if (fs.existsSync(figs)) fs.cpSync(figs, path.resolve(import.meta.dirname, "..", "public", "figures"), { recursive: true });

console.log(`content:seed — inserted ${inserted}, updated ${updated}, retired ${retired}`);
await client.end();
