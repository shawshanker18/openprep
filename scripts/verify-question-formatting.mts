import postgres from "postgres";
import katex from "katex";
import "katex/contrib/mhchem";
import { normalizeMarkdown } from "../src/lib/normalize-markdown";
const db = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
if (!process.env.DATABASE_URL?.includes("xtbvhxxoadkqxqauxyfp")) throw new Error("Use the separate test database for this audit.");
const rows = await db`select stem_md, passage_md, choices from questions where status='active'`;
let changed = 0, errors = 0, total = 0;
const samples: { math: string; error: string }[] = [];
for (const q of rows) {
  for (const text of [q.stem_md, q.passage_md, ...(Array.isArray(q.choices) ? q.choices.map(c => c.md) : [])]) {
    if (!text) continue;
    const md = normalizeMarkdown(text);
    if (md !== text) changed++;
    for (const match of md.matchAll(/(?<!\\)\$((?:\\\$|[^$])+)(?<!\\)\$/g)) {
      total++;
      try { katex.renderToString(match[1]!, { throwOnError: true, strict: false }); }
      catch (error) { errors++; if (!samples.some(sample => sample.math === match[1])) samples.push({ math: match[1]!, error: String(error) }); }
    }
  }
}
console.log(JSON.stringify({ questions: rows.length, changedFields: changed, mathExpressions: total, errors, samples }));
await db.end();
if (errors) process.exitCode = 1;
