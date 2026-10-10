"use server";
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/server/auth';
import { startTest } from '@/server/tests';

const paper = z.coerce.number().pipe(z.literal([1,2,3,4]));
const section = z.enum(['math','rw']);
// `scope` is what the clicked button asks for: the whole test, one adaptive section, or a single module.
const Start = z.discriminatedUnion('kind', [
  z.object({kind:z.literal('full'),paper}),
  z.object({kind:z.literal('section'),section,paper}),
  z.object({kind:z.literal('module'),section,route:z.enum(['base','easy','hard']),paper}),
]);
export async function startTestAction(form: FormData) {
  const {userId} = await requireUser();
  const [first='', second] = String(form.get('scope') ?? '').split(':');
  const scope = first==='full' ? {kind:'full'} : second ? {kind:'module',section:first,route:second} : {kind:'section',section:first};
  const parsed = Start.safeParse({...scope,paper:form.get('paper')});
  if (!parsed.success) redirect('/tests?error=invalid');
  const result = await startTest(userId, parsed.data);
  if (!result.ok) redirect(result.resumeId ? `/tests?resume=${result.resumeId}` : result.error==='rate' ? '/tests?error=rate' : '/tests?error=empty');
  redirect(`/test/${result.id}`);
}
