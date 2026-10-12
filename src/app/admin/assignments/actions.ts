"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/admin";
import { RULE_SLOTS, saveRule, saveVersion, setRuleStatus } from "@/server/assignment-admin";

/** Every privileged action checks admin rights first, before reading its input, so a non-admin never reaches the database. */
function ruleFromForm(form: FormData) {
  return {
    id: form.get("id") || undefined,
    name: String(form.get("name") ?? ""),
    description: String(form.get("description") ?? ""),
    status: String(form.get("status") ?? "draft"),
    priority: String(form.get("priority") ?? "0"),
    targetVersionId: String(form.get("targetVersionId") ?? ""),
    op: String(form.get("op") ?? "all"),
    chapters: Array.from({ length: RULE_SLOTS }, (_, i) => String(form.get(`chapter${i}`) ?? "")).filter(Boolean),
    effectiveFrom: String(form.get("effectiveFrom") ?? ""),
    effectiveUntil: String(form.get("effectiveUntil") ?? ""),
  };
}

const note = (problems: { message: string }[]) => encodeURIComponent(problems.map((p) => p.message).join(" · ").slice(0, 400));

export async function saveRuleAction(form: FormData) {
  const { adminId } = await requireAdmin();
  const r = await saveRule(adminId, ruleFromForm(form));
  revalidatePath("/admin/assignments", "layout");
  if (!r.ok) redirect(`/admin/assignments/rules/${form.get("id") || "new"}?error=${note(r.problems)}`);
  redirect(`/admin/assignments/rules/${r.value.id}?saved=1`);
}

export async function setRuleStatusAction(form: FormData) {
  const { adminId } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (status !== "draft" && status !== "live" && status !== "disabled") redirect(`/admin/assignments?error=${note([{ message: "Unknown status" }])}`);
  const r = await setRuleStatus(adminId, id, status);
  revalidatePath("/admin/assignments", "layout");
  if (!r.ok) redirect(`/admin/assignments/rules/${id}?error=${note(r.problems)}`);
  redirect(`/admin/assignments/rules/${id}?${new URLSearchParams({ recalculated: String(r.value.evaluated), changed: String(r.value.changed), ...(r.value.capped ? { capped: "1" } : {}) })}`);
}

export async function saveVersionAction(form: FormData) {
  const { adminId } = await requireAdmin();
  const r = await saveVersion(adminId, Object.fromEntries(form));
  revalidatePath("/admin/assignments", "layout");
  if (!r.ok) redirect(`/admin/assignments?error=${note(r.problems)}`);
  redirect(`/admin/assignments?saved=${encodeURIComponent(r.value.id)}`);
}
