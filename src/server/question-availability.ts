import 'server-only';
import { sql } from 'drizzle-orm';
import { questions } from '@/db/schema';

/**
 * The bank has two disjoint pools (docs/QUESTION_POOLS.md): `study` feeds practice and the question bank, `test` feeds
 * mock tests and the diagnostic. Keeping them apart means studying never uses up fresh test questions.
 */
export type QuestionPool = 'study' | 'test';

/** Skill drills run as tests (mini, weakness, custom) but are study tools, so they use the study pool; mock exams use the test pool. */
export const TEST_POOL_KINDS = ['full', 'section', 'module'] as const;
export const poolForTestKind = (kind: string): QuestionPool => (TEST_POOL_KINDS as readonly string[]).includes(kind) ? 'test' : 'study';

const notInActiveWork = (userId: string, exceptSession?: string) => sql`${questions.id} not in (
    select pi.question_id from practice_session_items pi join practice_sessions ps on ps.id=pi.session_id
    where ps.user_id=${userId} and ps.status='active'
      and (${exceptSession ?? null}::uuid is null or ps.id<>${exceptSession ?? null}::uuid)
  ) and ${questions.id} not in (
    select ti.question_id from test_items ti join test_modules tm on tm.id=ti.module_id
    join test_sessions ts on ts.id=tm.session_id
    where ts.user_id=${userId} and ts.status='in_progress'
  )`;

/**
 * Practice and question bank: study-pool questions, plus any test-pool question this student has already answered (so a
 * missed test question can still be reviewed). Never a test-pool question they have not seen. Excludes questions that are
 * in the student's active practice sessions or in-progress tests. Non-null keys make NOT IN safe, and hashed subplans build
 * the active sets once rather than joining once per candidate.
 */
export function availableQuestion(userId: string, exceptSession?: string) {
  return sql`(${questions.pool}='study' or exists (select 1 from attempts a where a.user_id=${userId} and a.question_id=${questions.id})) and ${notInActiveWork(userId, exceptSession)}`;
}

/** Mock tests and the diagnostic: test-pool questions only (excluding those in this student's other live work). */
export function availableTestQuestion(userId: string) {
  return sql`${questions.pool}='test' and ${notInActiveWork(userId)}`;
}
