// Validates everything under content/ (spec 02 §3, §5). Exits 1 on any error; warnings don't fail.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import katex from "katex";
import matter from "gray-matter";
import { SKILL_BY_ID } from "../src/content/taxonomy";
import { LESSON_HEADINGS, QuestionFileSchema, toRow, type ContentQuestion } from "../src/content/schema";

const ROOT = path.resolve(import.meta.dirname, "..", "content");
const LETTERS = ["A", "B", "C", "D"] as const;

/** Every $…$ / $$…$$ span, ignoring escaped \$ (use \$ for currency). */
export function mathSpans(md: string): string[] {
  const out: string[] = [];
  const re = /(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$|(?<!\\)\$([^$\n]+?)(?<!\\)\$/g;
  for (const m of md.matchAll(re)) out.push((m[1] ?? m[2])!);
  return out;
}

export function validateContent() {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: ReturnType<typeof toRow>[] = [];
  const seen = new Set<string>();
  const qDir = path.join(ROOT, "questions");

  for (const file of fs.existsSync(qDir) ? fs.readdirSync(qDir).filter((f) => f.endsWith(".json")) : []) {
    const skillId = file.replace(/\.json$/, "");
    const at = (id: string, msg: string) => errors.push(`questions/${file} ${id}: ${msg}`);
    const skill = SKILL_BY_ID[skillId];
    if (!skill) { errors.push(`questions/${file}: unknown skill id "${skillId}"`); continue; }

    let parsed: ContentQuestion[];
    try {
      const res = QuestionFileSchema.safeParse(JSON.parse(fs.readFileSync(path.join(qDir, file), "utf8")));
      if (!res.success) {
        for (const i of res.error.issues) errors.push(`questions/${file} [${i.path.join(".")}]: ${i.message}`);
        continue;
      }
      parsed = res.data;
    } catch (e) {
      errors.push(`questions/${file}: invalid JSON (${(e as Error).message})`);
      continue;
    }

    for (const q of parsed) {
      if (!q.id.startsWith(`${skillId}-`) || !/^\d{4}$/.test(q.id.slice(skillId.length + 1))) at(q.id, `id must be ${skillId}-NNNN`);
      if (seen.has(q.id)) at(q.id, "duplicate id");
      seen.add(q.id);
      if (q.type === "spr" && skill.section !== "math") at(q.id, "SPR questions are math-only");
      if (skill.section === "rw") {
        if (!q.passage) at(q.id, "R&W questions need a passage");
        else {
          const words = q.passage.split(/\s+/).filter(Boolean).length;
          if (words < 25 || words > 150) at(q.id, `passage is ${words} words (25–150)`);
        }
      }
      if (q.type === "mcq") {
        const wrong = LETTERS.filter((l) => l !== q.answer);
        const keys = Object.keys(q.rationales).sort().join("");
        if (keys !== wrong.join("")) at(q.id, `rationales must cover exactly the wrong choices ${wrong.join(", ")}`);
        if (new Set(q.choices).size !== 4) at(q.id, "choices must be distinct");
      }
      if (q.desmos && !q.tags.includes("desmos")) at(q.id, 'has desmos steps but no "desmos" tag');
      if (!q.desmos && q.tags.includes("desmos")) at(q.id, '"desmos" tag but no desmos steps');

      const texts = [q.passage, q.stem, q.explanation, q.fastMethod, q.desmos?.steps,
        ...(q.type === "mcq" ? [...q.choices, ...Object.values(q.rationales)] : [])].filter(Boolean) as string[];
      for (const t of texts) {
        for (const tex of mathSpans(t)) {
          try { katex.renderToString(tex, { throwOnError: true }); }
          catch (e) { at(q.id, `KaTeX: ${(e as Error).message.split("\n")[0]}`); }
        }
        for (const [, src] of t.matchAll(/!\[[^\]]*\]\((\/figures\/[^)]+)\)/g))
          if (!fs.existsSync(path.join(ROOT, src!.replace(/^\//, "")))) at(q.id, `missing figure ${src}`);
        if (/<[a-z][^>]*>/i.test(t)) at(q.id, "raw HTML is not allowed");
      }
      rows.push(toRow(skillId, q));
    }

    const mcqs = parsed.filter((q) => q.type === "mcq");
    if (mcqs.length >= 20) for (const l of LETTERS) {
      const share = mcqs.filter((q) => q.answer === l).length / mcqs.length;
      if (share > 0.4) warnings.push(`questions/${file}: ${Math.round(share * 100)}% of answers are ${l}`);
    }
  }

  const lDir = path.join(ROOT, "lessons");
  for (const file of fs.existsSync(lDir) ? fs.readdirSync(lDir).filter((f) => f.endsWith(".md")) : []) {
    const skillId = file.replace(/\.md$/, "");
    const { data, content } = matter(fs.readFileSync(path.join(lDir, file), "utf8"));
    if (!SKILL_BY_ID[skillId]) errors.push(`lessons/${file}: unknown skill id`);
    if (data.skill !== skillId) errors.push(`lessons/${file}: frontmatter skill must be "${skillId}"`);
    const headings = [...content.matchAll(/^## (.+)$/gm)].map((m) => m[1]!.trim());
    if (headings.join("|") !== LESSON_HEADINGS.join("|"))
      errors.push(`lessons/${file}: headings must be exactly: ${LESSON_HEADINGS.join(" / ")}`);
    const words = content.split(/\s+/).filter(Boolean).length;
    if (words < 400 || words > 900) warnings.push(`lessons/${file}: ${words} words (aim for 400–900)`);
    for (const tex of mathSpans(content)) {
      try { katex.renderToString(tex, { throwOnError: true }); }
      catch (e) { errors.push(`lessons/${file}: KaTeX: ${(e as Error).message.split("\n")[0]}`); }
    }
  }

  const dDir = path.join(ROOT, "desmos");
  for (const file of fs.existsSync(dDir) ? fs.readdirSync(dDir).filter((f) => f.endsWith(".md")) : []) {
    try {
      const { data, content } = matter(fs.readFileSync(path.join(dDir, file), "utf8"));
      if (!data.title || !Number.isFinite(Number(data.order))) errors.push(`desmos/${file}: frontmatter needs title and order`);
      if (data.expressions !== undefined && !Array.isArray(data.expressions)) errors.push(`desmos/${file}: expressions must be a list`);
      for (const tex of mathSpans(content)) {
        try { katex.renderToString(tex, { throwOnError: true }); }
        catch (e) { errors.push(`desmos/${file}: KaTeX: ${(e as Error).message.split("\n")[0]}`); }
      }
    } catch (e) { errors.push(`desmos/${file}: invalid frontmatter (${(e as Error).message.split("\n")[0]})`); }
  }

  return { errors, warnings, rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { errors, warnings, rows } = validateContent();
  for (const w of warnings) console.warn(`warn  ${w}`);
  for (const e of errors) console.error(`error ${e}`);
  const cells = new Map<string, number>();
  for (const r of rows) cells.set(`${r.skillId}:${r.difficulty}`, (cells.get(`${r.skillId}:${r.difficulty}`) ?? 0) + 1);
  const thin = Object.keys(SKILL_BY_ID).flatMap((s) => [1, 2, 3].filter((d) => (cells.get(`${s}:${d}`) ?? 0) < 3).map((d) => `${s}:${d}`));
  console.log(`${rows.length} questions, ${errors.length} errors, ${warnings.length} warnings; ${thin.length}/87 skill×difficulty cells below the dev gate (3)`);
  process.exit(errors.length ? 1 : 0);
}
