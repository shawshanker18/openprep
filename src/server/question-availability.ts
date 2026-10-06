import 'server-only';
import { sql } from 'drizzle-orm';
import { questions } from '@/db/schema';

/** Account-scoped exclusion, used by previews, practice selection and test assembly. */
export function availableQuestion(userId: string, exceptSession?: string) {
  return sql`not exists (
    select 1 from practice_session_items pi join practice_sessions ps on ps.id=pi.session_id
    where ps.user_id=${userId} and ps.status='active' and pi.question_id=${questions.id}
      and (${exceptSession ?? null}::uuid is null or ps.id<>${exceptSession ?? null}::uuid)
  ) and not exists (
    select 1 from test_items ti join test_modules tm on tm.id=ti.module_id
    join test_sessions ts on ts.id=tm.session_id
    where ts.user_id=${userId} and ts.status='in_progress' and ti.question_id=${questions.id}
  )`;
}
