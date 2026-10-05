"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { requireAdmin } from "@/server/admin";

/** Retirement and its audit record commit together. Replacement content uses the normal content review process. */
export async function retireQuestion(form:FormData) {
  const {adminId}=await requireAdmin();
  const p=z.object({id:z.string().min(1).max(128),reason:z.string().trim().min(5).max(500)}).safeParse(Object.fromEntries(form));
  if(!p.success) return;
  await db.transaction(async tx=>{
    const [row]=await tx.update(questions).set({status:"retired"}).where(eq(questions.id,p.data.id)).returning({id:questions.id});
    if(row) {
      const {adminAudit}=await import('@/db/schema');
      await tx.insert(adminAudit).values({adminId,action:"question.retire",target:row.id,detail:{reason:p.data.reason}});
    }
  });
  revalidatePath('/admin/exposure');
}
