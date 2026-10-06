import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { deliveryContext } from './delivery-context';
import { eventQuota, exposeQuestions, lockDelivery } from './delivery';
import { availableQuestion } from './question-availability';
import { toPublic } from './questions';

export async function previewQuestions(userId: string, skillIds: string[], difficulty?: number) {
  if (!skillIds.length) return [];
  const context = await deliveryContext();
  await eventQuota(userId, context, 'set');
  return db.transaction(async tx => {
    await lockDelivery(tx, userId, context);
    const rows = await tx.select().from(questions).where(and(eq(questions.status, 'active'),
      inArray(questions.skillId, skillIds), difficulty ? eq(questions.difficulty, difficulty) : undefined,
      availableQuestion(userId))).orderBy(questions.id).limit(5);
    await exposeQuestions(tx, userId, rows, context);
    return rows.map(q => toPublic(q, userId));
  });
}
