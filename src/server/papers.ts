import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

const Config = z.object({
  mode: z.enum(['skill','smart','review','set','list']), skillId:z.string().min(1).max(64).optional(),
  difficulty:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal('mixed')]).optional(),
  skillIds:z.array(z.string().min(1).max(64)).max(29).optional(), tags:z.array(z.string().min(1).max(64)).max(50).optional(),
  timing:z.enum(['auto','off','on']).optional(), ids:z.array(z.string().regex(/^[\w-]{22}$/)).max(50).optional(),
});
export type PaperConfig = z.infer<typeof Config>;
function key() {
  const secret=process.env.QUESTION_ID_SECRET || process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV==='production') throw new Error('Missing question delivery secret');
  return createHash('sha256').update(secret || 'local-development-only').digest();
}
export function createPaper(userId:string, config:PaperConfig) {
  const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key(),iv);
  const payload=JSON.stringify({userId,expires:Date.now()+24*3600_000,config:Config.parse(config)});
  return Buffer.concat([iv,cipher.update(payload),cipher.final(),cipher.getAuthTag()]).toString('base64url');
}
export function readPaper(userId:string, token:string):PaperConfig|null {
  try {
    if (!/^[\w-]{40,12000}$/.test(token)) return null;
    const b=Buffer.from(token,'base64url'), decipher=createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));
    decipher.setAuthTag(b.subarray(-16));
    const p=JSON.parse(Buffer.concat([decipher.update(b.subarray(12,-16)),decipher.final()]).toString('utf8'));
    if(p.userId!==userId || !Number.isFinite(p.expires) || p.expires<Date.now()) return null;
    return Config.parse(p.config);
  } catch { return null; }
}
