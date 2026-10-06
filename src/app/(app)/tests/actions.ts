"use server";
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/server/auth';
import { startTest } from '@/server/tests';
const Start = z.discriminatedUnion('kind', [
  z.object({kind:z.literal('full')}),
  z.object({kind:z.literal('module'),section:z.enum(['math','rw'])}),
]);
export async function startTestAction(form: FormData) {
  const {userId} = await requireUser();
  const parsed = Start.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/tests?error=invalid');
  const result = await startTest(userId, parsed.data);
  if (!result.ok) redirect(result.resumeId ? `/tests?resume=${result.resumeId}` : result.error==='rate' ? '/tests?error=rate' : '/tests?error=empty');
  redirect(`/test/${result.id}`);
}
