"use server";
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/server/auth';
import { startTest } from '@/server/tests';
import { getTier } from '@/server/subscription';
import { canOpenPaper } from '@/lib/tiers';

const paper = z.coerce.number().pipe(z.literal([1,2,3,4]));
const section = z.enum(['math','rw']);
const difficulty = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal('mixed')]).optional();
const DIFF_MAP: Record<string, 1 | 2 | 3 | "mixed"> = {
  easy: 1,
  medium: 2,
  hard: 3,
  mixed: "mixed",
};
// `scope` is what the clicked button asks for: the whole test, one adaptive section, or a single module.
const Start = z.discriminatedUnion('kind', [
  z.object({kind:z.literal('full'),paper,difficulty}),
  z.object({kind:z.literal('section'),section,paper,difficulty}),
  z.object({kind:z.literal('module'),section,route:z.enum(['base','easy','hard']),paper,difficulty}),
]);
export async function startTestAction(form: FormData) {
  const {userId} = await requireUser();
  const [first='', second] = String(form.get('scope') ?? '').split(':');
  const scope = first==='full' ? {kind:'full'} : second ? {kind:'module',section:first,route:second} : {kind:'section',section:first};
  const diffVal = form.get('difficulty');
  const diffParsed = typeof diffVal === 'string' && diffVal ? diffVal.toLowerCase() : undefined;
  const mappedDiff = diffParsed ? DIFF_MAP[diffParsed] : undefined;
  const parsed = Start.safeParse({...scope,paper:form.get('paper'),difficulty:mappedDiff});
  if (!parsed.success) redirect('/tests?error=invalid');
  if (!canOpenPaper(await getTier(userId), parsed.data.paper)) redirect('/pricing');
  const result = await startTest(userId, parsed.data);
  if (!result.ok) redirect(result.resumeId ? `/tests?resume=${result.resumeId}` : result.error==='rate' ? '/tests?error=rate' : '/tests?error=empty');
  redirect(`/test/${result.id}`);
}
