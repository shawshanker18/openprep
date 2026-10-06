import 'server-only';
import { sql } from 'drizzle-orm';
import { questions } from '@/db/schema';

/** Stable one-in-five partition keeps fresh test content out of practice without changing stored questions. */
export function reservedForTests() {
  return sql`mod(abs(hashtext(${questions.id})::bigint),5)=0`;
}

/** Account-scoped exclusion. Non-null question keys make NOT IN safe; hashed subplans build the active sets once, rather than joining once per candidate. */
export function availableQuestion(userId: string, exceptSession?: string, includeReserved = false) {
  return sql`(${includeReserved} or not (${reservedForTests()}) or exists (select 1 from attempts a where a.user_id=${userId} and a.question_id=${questions.id})) and ${questions.id} not in (
    select pi.question_id from practice_session_items pi join practice_sessions ps on ps.id=pi.session_id
    where ps.user_id=${userId} and ps.status='active'
      and (${exceptSession ?? null}::uuid is null or ps.id<>${exceptSession ?? null}::uuid)
  ) and ${questions.id} not in (
    select ti.question_id from test_items ti join test_modules tm on tm.id=ti.module_id
    join test_sessions ts on ts.id=tm.session_id
    where ts.user_id=${userId} and ts.status='in_progress'
  )`;
}
