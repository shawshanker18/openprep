"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { internalId } from "@/server/questions";
import { BOOKMARK_NOTE_LIMIT, saveBookmarkNote } from "@/server/bookmarks";
import { limitPractice } from "@/server/ratelimit";

export async function updateBookmarkNote(pub: string, _previous: { message: string; ok: boolean }, form: FormData) {
  const { userId } = await requireUser();
  const note = form.get("note");
  if (typeof note !== "string" || note.length > BOOKMARK_NOTE_LIMIT) return { ok: false, message: "Notes must be 2,000 characters or fewer." };
  const limited = await limitPractice(userId, "request");
  if (limited) return { ok: false, message: limited };
  const questionId = await internalId(pub, userId);
  if (!questionId) return { ok: false, message: "Saved question not found." };
  try {
    if (!(await saveBookmarkNote(userId, questionId, note))) return { ok: false, message: "Saved question not found." };
    revalidatePath("/bookmarks");
    return { ok: true, message: "Notes saved." };
  } catch {
    return { ok: false, message: "Couldn't save your notes. Please try again." };
  }
}
