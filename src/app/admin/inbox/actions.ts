"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { feedback, questionReports, securityReports } from "@/db/schema";
import { text } from "@/lib/text";
import { audit, requireAdmin } from "@/server/admin";

const TABLES = { feedback, questions: questionReports, security: securityReports } as const;

const Update = z.object({
  type: z.enum(["feedback", "questions", "security"]),
  id: z.uuid(),
  status: z.enum(["new", "in_progress", "resolved", "dismissed"]),
  note: text().trim().max(2000),
});

/** An admin moves a request along (status + private note). Checked here too: actions can be called directly. */
export async function updateRequest(form: FormData) {
  const { adminId } = await requireAdmin();
  const p = Update.safeParse({ type: form.get("type"), id: form.get("id"), status: form.get("status"), note: form.get("note") ?? "" });
  if (!p.success) return;
  const t = TABLES[p.data.type];
  const [row] = await db.update(t).set({ status: p.data.status, adminNote: p.data.note || null, handledBy: adminId, handledAt: new Date() })
    .where(eq(t.id, p.data.id)).returning({ id: t.id });
  if (!row) return;
  await audit(adminId, `${p.data.type}.${p.data.status}`, p.data.id, p.data.note ? { note: p.data.note.slice(0, 200) } : undefined);
  revalidatePath("/admin", "layout");
}
