"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/admin";
import { deleteConcept, saveConcept } from "@/server/concepts";

const note = (problems: { message: string }[]) => encodeURIComponent(problems.map((p) => p.message).join(" · ").slice(0, 400));

/** Create or update one concept with its explanation and questions. The form posts `questions` once per chosen question. */
export async function saveConceptAction(form: FormData) {
  const { adminId } = await requireAdmin();
  const skillId = String(form.get("skillId") ?? "");
  const id = String(form.get("id") ?? "") || undefined;
  const r = await saveConcept(adminId, {
    id, skillId, title: String(form.get("title") ?? ""), explanationMd: String(form.get("explanationMd") ?? ""),
    sort: String(form.get("sort") ?? "0"), questionIds: form.getAll("questions").map(String),
  });
  revalidatePath("/admin/concepts", "layout");
  revalidatePath("/start", "layout");
  const here = `/admin/concepts/${encodeURIComponent(skillId)}`;
  if (!r.ok) redirect(`${here}?error=${note(r.problems)}${id ? `#c-${id}` : ""}`);
  redirect(`${here}?saved=${r.value.id}#c-${r.value.id}`);
}

export async function deleteConceptAction(form: FormData) {
  const { adminId } = await requireAdmin();
  const skillId = String(form.get("skillId") ?? "");
  await deleteConcept(adminId, String(form.get("id") ?? ""));
  revalidatePath("/admin/concepts", "layout");
  revalidatePath("/start", "layout");
  redirect(`/admin/concepts/${encodeURIComponent(skillId)}?deleted=1`);
}
