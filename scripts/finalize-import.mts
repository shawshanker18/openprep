// Apply a reviewed taxonomy correction to the existing source-backed repair plan.
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
const dir=process.argv[2];
if(!dir || !fs.existsSync(path.join(dir,'questions-before-repair.json'))) throw new Error('Full pre-repair backup required');
const rows=JSON.parse(fs.readFileSync(path.join(dir,'import-repair-plan.json'),'utf8')) as {id:string;skill_id:string;file:string}[];
const changes=rows.filter(r=>r.file.includes('Geometry and Trigonometry/')).map(r=>{
  const topic=path.basename(r.file).toLowerCase();
  return {id:r.id,skill_id:/area|volume/.test(topic)?'m-geo-area':/trig/.test(topic)?'m-geo-trig':/circle/.test(topic)?'m-geo-circles':'m-geo-lines'};
});
const db=postgres(process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL!,{prepare:false,max:1});
await db.begin(async tx=>{
  for(let i=0;i<changes.length;i+=500) await tx`update public.questions q set skill_id=u.skill_id,tags=jsonb_build_array(u.skill_id) from jsonb_to_recordset(${tx.json(changes.slice(i,i+500))}) as u(id text,skill_id text) where q.id=u.id and q.status='active'`;
  // Importer used old skill tags; keep the canonical skill tag consistent with repaired taxonomy.
  await tx`update public.questions set tags=jsonb_build_array(skill_id) where status='active'`;
});
console.log(`Corrected ${changes.length} geometry classifications and synchronized active skill tags.`);
await db.end();
