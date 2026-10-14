"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/admin";
import { addMembers, deleteGroup, removeMember, saveGroup, userIdsByEmail } from "@/server/groups";
import { note } from "@/server/form-note";

const idOf = (form: FormData) => { const id = String(form.get("id") ?? ""); return z.uuid().safeParse(id).success ? id : ""; };

export async function saveGroupAction(form: FormData) {
  const { adminId } = await requireAdmin();
  const id = idOf(form);
  const r = await saveGroup(adminId, { id: id || undefined, name: String(form.get("name") ?? ""), description: String(form.get("description") ?? "") });
  revalidatePath("/admin/groups", "layout");
  if (!r.ok) redirect(id ? `/admin/groups/${id}?error=${note(r.problems)}` : `/admin/groups?error=${note(r.problems)}`);
  redirect(`/admin/groups/${r.value.id}?saved=1`);
}

export async function deleteGroupAction(form: FormData) {
  const { adminId } = await requireAdmin();
  const id = idOf(form);
  const r = await deleteGroup(adminId, id);
  revalidatePath("/admin/groups", "layout");
  if (!r.ok) redirect(`/admin/groups/${id}?error=${note(r.problems)}`);
  redirect(`/admin/groups?deleted=1`);
}

export async function addMembersAction(form: FormData) {
  const { adminId } = await requireAdmin();
  const id = idOf(form);
  const { ids, missing, tooMany } = await userIdsByEmail(String(form.get("emails") ?? "").slice(0, 60_000));
  const r = await addMembers(adminId, id, ids);
  revalidatePath("/admin/groups", "layout");
  if (!r.ok) redirect(`/admin/groups/${id}?error=${note(r.problems)}`);
  const q = new URLSearchParams({ added: String(r.value.added), already: String(ids.length - r.value.added - r.value.skipped) });
  if (missing.length) q.set("missing", missing.slice(0, 20).join(", "));
  if (tooMany) q.set("many", "1");
  redirect(`/admin/groups/${id}?${q}`);
}

export async function removeMemberAction(form: FormData) {
  const { adminId } = await requireAdmin();
  const id = idOf(form);
  const userId = String(form.get("userId") ?? "");
  if (z.uuid().safeParse(userId).success) await removeMember(adminId, id, userId);
  revalidatePath("/admin/groups", "layout");
  redirect(`/admin/groups/${id}?removed=1`);
}
