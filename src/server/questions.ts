// SECURITY-CRITICAL (spec 01 §6): the browser only ever sees PublicQuestion until the student has
// submitted (practice) or completed the whole session (tests). Never pass a full Question row as a prop.
import "server-only";
import { createHmac } from "node:crypto";
import { db } from "@/db";
import { questions, type Question } from "@/db/schema";
import { memo } from "@/lib/memo";

// Public question IDs: the browser never sees internal IDs like "m-adv-equiv-0001" (guessable, and they reveal the
// bank's structure). It sees a keyed hash instead, which can't be reversed or guessed; only the server maps it back.
const ID_KEY = process.env.QUESTION_ID_SECRET || process.env.CRON_SECRET
  || (process.env.NODE_ENV === "production" ? undefined : "local-development-only");
if (!ID_KEY) throw new Error("QUESTION_ID_SECRET (or CRON_SECRET) must be set in production");

/** Internal id → the opaque id the browser uses (stable, 22 characters). */
export const publicId = (id: string) => createHmac("sha256", ID_KEY!).update(`question:${id}`).digest("base64url").slice(0, 22);

const idMap = memo(600_000, async () => {
  const rows = await db.select({ id: questions.id }).from(questions);
  return new Map(rows.map((r) => [publicId(r.id), r.id]));
});
let rebuilt = 0;
/** Opaque id from the browser → internal id, or null if it isn't one of ours. */
export async function internalId(pub: string): Promise<string | null> {
  if (!/^[\w-]{22}$/.test(pub)) return null;
  const hit = (await idMap()).get(pub);
  if (hit || Date.now() - rebuilt < 60_000) return hit ?? null;
  rebuilt = Date.now(); // maybe a question added since the map was built: rebuild once a minute at most
  return (await idMap.refresh()).get(pub) ?? null;
}
/** Many at once; unknown ids are dropped. */
export async function internalIds(pubs: string[]) {
  const ids = await Promise.all(pubs.map(internalId));
  return ids.filter((x): x is string => !!x);
}

export type PublicQuestion = Pick<Question,
  "id" | "passageMd" | "stemMd" | "choices">;
export type RevealedQuestion = PublicQuestion & Pick<Question,
  "answer" | "explanationMd" | "choiceRationales" | "fastMethodMd" | "desmos">;

export function toPublic(q: Question): PublicQuestion {
  const md = (s: string) => questionMarkdown(q,s);
  return { id: publicId(q.id), passageMd: q.passageMd ? md(q.passageMd) : null, stemMd: md(q.stemMd),
    choices: q.choices?.map(c=>({...c,md:md(c.md)})) ?? null };
}
export function questionMarkdown(q:Pick<Question,'id'|'stemMd'|'passageMd'|'choices'>,s:string) {
  const ids=questionAssetIds(q);
  return s.replace(/asset:\/\/([\w-]+)/g,(_,id:string)=>`/api/question-assets/${publicId(q.id)}/${ids.indexOf(id)}`);
}
export function questionAssetIds(q: Pick<Question,'stemMd'|'passageMd'|'choices'>) {
  return [...new Set([q.stemMd,q.passageMd??'',...(q.choices?.map(c=>c.md)??[])].flatMap(s=>[...s.matchAll(/asset:\/\/([\w-]+)/g)].map(m=>m[1]!)))];
}

export const toRevealed = (q: Question): RevealedQuestion => ({
  ...toPublic(q), answer: q.answer, explanationMd: q.explanationMd, choiceRationales: q.choiceRationales,
  fastMethodMd: q.fastMethodMd, desmos: q.desmos,
});
