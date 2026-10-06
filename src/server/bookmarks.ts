import "server-only";
import { and, eq } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { bookmarks } from "@/db/schema";

export const BOOKMARK_NOTE_LIMIT = 2000;

/** Updates only an existing bookmark owned by this student. Never creates a bookmark. */
export async function saveBookmarkNote(userId: string, questionId: string, note: string, executor: Tx | typeof db = db) {
  if (!userId || !questionId || typeof note !== "string" || note.length > BOOKMARK_NOTE_LIMIT) return false;
  const rows = await executor.update(bookmarks).set({ note }).where(and(
    eq(bookmarks.userId, userId), eq(bookmarks.questionId, questionId),
  )).returning({ questionId: bookmarks.questionId });
  return rows.length === 1;
}
