// Private archive stays outside Git. Dry-run first; --apply requires an existing full backup.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import postgres from 'postgres';
import { SKILL_BY_ID } from '../src/content/taxonomy';
type Table={headers?:unknown[];rows?:unknown[][]};
type Rich={text?:string;md?:string;table?:Table};
type SourceRecord={file:string;index:number;category:string;difficulty:string;revamped?:{answer?:string;stem?:string;prompt?:string;choices?:(string|Rich)[];passage?:string|Rich;table?:Table}};
type RepairRow={id:string;skill_id:string;difficulty:number|undefined;section:string;domain:string;type:string;stem_md:string;passage_md:string|null;choices:{id:string;md:string}[]|null;answer:{choice:string}|{accepted:string[]};file:string;index:number};
const [sourcePath, outputDir, flag] = process.argv.slice(2);
if (!sourcePath || !outputDir) throw new Error('Usage: repair-import.mts source.json output-directory [--apply]');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8')) as {rows:SourceRecord[];images:Record<string,string>};
const connection = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
if (!connection) throw new Error('Missing database connection');
const db = postgres(connection, { prepare: false, max: 1 });
const windowsBytes = new Map(Array.from({length:256},(_,i)=>[new TextDecoder('windows-1252').decode(Uint8Array.of(i)),i] as const));
const cp1252 = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';
[...cp1252].forEach((c,i)=>windowsBytes.set(c,128+i));
function unmojibake(s: string) {
  if (!/[\u00e2\u00c3\u00c2\u00c4\u00c5\u00ca]/.test(s)) return s;
  const bytes = [...s].map(c=>windowsBytes.get(c));
  if (bytes.some(b=>b===undefined)) return s;
  const decoded = Buffer.from(bytes as number[]).toString('utf8');
  return decoded.includes('\ufffd') ? s : decoded;
}
const clean = (s: unknown): string => unmojibake(String(s ?? '')).replace(/\\n(?![a-zA-Z])/g, '\n').replace(/\\\\/g, '\\')
  .replace(/\fr ac/g, '\\frac').replace(/\frac/g, '\\frac').replace(/\u0008/g, '\\b').replace(/\u0009(?=ext|heta|imes)/g, '\\t').trim();
const norm = (s: unknown) => clean(s).replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
const key = (stem: unknown, answer: unknown) => `${norm(stem)}\x1f${String(answer).trim()}`;
function table(t: Table|undefined) {
  if (!t) return '';
  const cell = (v: unknown) => clean(v).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const headers = t.headers ?? (t.rows?.[0]?.map((_: unknown, i: number) => `Column ${i + 1}`) ?? []);
  return `\n\n| ${headers.map(cell).join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${(t.rows ?? []).map((r) => `| ${r.map(cell).join(' | ')} |`).join('\n')}`;
}
const content = (v: string|Rich|undefined) => typeof v === 'string' ? clean(v) : clean(v?.text ?? v?.md ?? '') + table(v?.table);
const buckets = new Map<string, SourceRecord[]>();
for (const r of source.rows) {
  const v = r.revamped;
  if (!v?.answer || !(v.stem || v.prompt)) continue;
  const k = key(v.stem || v.prompt, v.answer);
  buckets.set(k, [...(buckets.get(k) ?? []), r]);
}
fs.mkdirSync(outputDir, { recursive: true });
const rows = await db`select * from public.questions where status='active' order by id`;
const assets = fs.existsSync(path.join(outputDir,'assets.json')) ? JSON.parse(fs.readFileSync(path.join(outputDir,'assets.json'),'utf8')) : await db`select id, sha256 from private.question_assets`;
const assetByHash = new Map<string,string>(assets.map((a: {sha256:string;id:string}) => [a.sha256, a.id]));
const updates: RepairRow[] = [], unresolved: {id:string;reason:string}[] = [];
const usedSource = new Set<string>();
const testIds = new Set((await db`select distinct question_id from public.test_items`).map(r=>r.question_id));
function sourceSkill(category:string) {
  const c=category.toLowerCase();
  if (c.startsWith('algebra:')) {
    if (/inequalit/.test(c)) return 'm-alg-ineq';
    if (/system/.test(c)) return 'm-alg-systems';
    if (/two variables/.test(c)) return 'm-alg-lin2';
    if (/one variable|equation word|solving linear/.test(c)) return 'm-alg-lin1';
    return 'm-alg-linfunc';
  }
  if(c.startsWith('advanced math:')) return /equivalent|factoring|polynomial expressions|operations|radicals and rational/.test(c)?'m-adv-equiv':/equations|isolating|systems/.test(c)?'m-adv-nonlin-eq':'m-adv-nonlin-func';
  if(c.startsWith('geometry')) { const topic=c.split(':').slice(1).join(':'); return /area|volume/.test(topic)?'m-geo-area':/circle/.test(topic)?'m-geo-circles':/trig/.test(topic)?'m-geo-trig':'m-geo-lines'; }
  if(c.startsWith('problem-solving')) {
    if(/percent/.test(c)) return 'm-psda-percent';
    if(/probability/.test(c)) return 'm-psda-prob';
    if(/statistical claims|studies|experiments/.test(c)) return 'm-psda-claims';
    if(/inference|margin/.test(c)) return 'm-psda-inference';
    if(/two-variable|scatter|growth/.test(c)) return 'm-psda-twovar';
    if(/one-variable|center|spread|shape|data representations/.test(c)) return 'm-psda-onevar';
    return 'm-psda-ratios';
  }
  if(/words in context/.test(c)) return 'rw-cs-words';
  if(/cross-text/.test(c)) return 'rw-cs-crosstext';
  if(/text structure/.test(c)) return 'rw-cs-structure';
  if(/evidence/.test(c)) return 'rw-ii-evidence';
  if(/inferences/.test(c)) return 'rw-ii-inference';
  if(/central ideas/.test(c)) return 'rw-ii-central';
  if(/transitions/.test(c)) return 'rw-ei-transitions';
  if(/synthesis/.test(c)) return 'rw-ei-synthesis';
  if(/boundaries|punctuation|linking clauses|supplements/.test(c)) return 'rw-sec-boundaries';
  if(/standard english/.test(c)) return 'rw-sec-form';
  return undefined;
}
for (const q of rows) {
  const answer = typeof q.answer === 'string' ? q.answer : q.answer.choice ?? q.answer.accepted?.[0];
  const candidates = buckets.get(key(q.stem_md, answer)) ?? [];
  // A repeated instruction can refer to different passages/tables. Narrow with imported choices first.
  let choices: unknown = q.choices;
  if (typeof choices === 'string') { try { choices = JSON.parse(choices); } catch {} }
  const signature = (a: unknown) => JSON.stringify((Array.isArray(a) ? a : [a]).map((x: string|Rich|undefined) => norm(content(x))));
  const narrowed = candidates.filter(r => signature(r.revamped!.choices ?? [r.revamped!.answer]) === signature(choices));
  const available = narrowed.length ? narrowed : candidates;
  const sameDifficulty = available.filter(r=>({Easy:1,Medium:2,Hard:3} as Record<string,number>)[r.difficulty]===q.difficulty);
  const matches = sameDifficulty.length ? sameDifficulty : available;
  const variants = new Set(matches.map(r => JSON.stringify(r.revamped)));
  if (!matches.length || (variants.size !== 1 && testIds.has(q.id))) { unresolved.push({ id: q.id, reason: matches.length ? 'ambiguous source in existing test' : 'no source match' }); continue; }
  // The old import discarded passages, so identical instructions cannot recover provenance.
  // Reconstruct unattempted records from distinct authoritative source records; never guess for existing tests.
  const r = matches.find(r=>!usedSource.has(`${r.file}:${r.index}`));
  if (!r) { unresolved.push({id:q.id,reason:'excess duplicate import'}); continue; }
  usedSource.add(`${r.file}:${r.index}`);
  const v = r.revamped!;
  let missing = false;
  const resolveImages = (s: string) => s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const name = url.split('/').pop();
    const hash = source.images[name];
    const id = hash ? assetByHash.get(hash) : undefined;
    if (!id) { missing = true; return `![${alt}](${url})`; }
    return `![${alt}](asset://${id})`;
  });
  const skill = SKILL_BY_ID[sourceSkill(r.category) ?? ''];
  if (!skill) { unresolved.push({ id: q.id, reason: 'unknown skill' }); continue; }
  const mcq = Array.isArray(v.choices) && /^[A-D]$/.test(String(v.answer)) && v.choices.length > 1;
  const normalizedChoices = mcq ? v.choices!.map((c, i) => ({ id: String.fromCharCode(65+i), md: resolveImages(content(c)) })) : null;
  const stem = resolveImages(clean(v.stem || v.prompt) + table(v.table));
  const passage = v.passage ? resolveImages(content(v.passage)) : null;
  if (missing) { unresolved.push({ id: q.id, reason: 'archive image missing from stored assets' }); continue; }
  const accepted = String(v.answer).split(/\s+(?:or|OR)\s+|\s*;\s*/).map(clean);
  if (!mcq && accepted.some(s => !/^-?(\d+\.?\d*|\.\d+)(\/\d+)?$/.test(s))) { unresolved.push({ id: q.id, reason: 'unsupported numeric answer' }); continue; }
  updates.push({ id:q.id, skill_id:skill.id, difficulty:({Easy:1,Medium:2,Hard:3} as Record<string,number>)[r.difficulty], section:skill.section, domain:skill.domain, type:mcq?'mcq':'spr', stem_md:stem, passage_md:passage,
    choices:normalizedChoices, answer:mcq?{choice:String(v.answer)}:{accepted}, file:r.file,index:r.index });
}
const report = { activeBefore:rows.length, matched:updates.length, unresolved:unresolved.length, reasons:unresolved.reduce((a,r)=>({...a,[r.reason]:(a[r.reason]??0)+1}),{} as Record<string,number>), unresolvedRows:unresolved };
fs.writeFileSync(path.join(outputDir,'import-repair-analysis.json'), JSON.stringify(report,null,2));
fs.writeFileSync(path.join(outputDir,'import-repair-plan.json'), JSON.stringify(updates));
const backup = path.join(outputDir,'questions-before-repair.json');
if (!fs.existsSync(backup)) fs.writeFileSync(backup, JSON.stringify(await db`select * from public.questions`));
console.log(JSON.stringify({...report,unresolvedRows:undefined}));
if (flag === '--apply') {
  if ((await db`select count(*)::int as n from public.attempts`)[0]!.n) throw new Error('Attempt history exists; manual provenance review required before reconstruction');
  if (unresolved.some(r=>testIds.has(r.id))) throw new Error('An unresolved question belongs to an existing test; review required');
  await db.begin(async tx => {
    for (let i=0;i<updates.length;i+=500) await tx`
      update public.questions q set skill_id=u.skill_id,difficulty=u.difficulty,section=u.section,domain=u.domain,type=u.type,
      stem_md=u.stem_md,passage_md=u.passage_md,choices=u.choices,answer=u.answer,desmos=null,version=q.version+1
      from jsonb_to_recordset(${tx.json(updates.slice(i,i+500))}) as u(id text,skill_id text,difficulty smallint,section text,domain text,type text,stem_md text,passage_md text,choices jsonb,answer jsonb)
      where q.id=u.id`;
    if(unresolved.length) await tx`update public.questions set status='retired' where id=any(${unresolved.map(r=>r.id)}::text[])`;
  });
  console.log(`Applied ${updates.length} source-backed repairs. Backup SHA256 ${crypto.createHash('sha256').update(fs.readFileSync(backup)).digest('hex')}`);
}
await db.end();
