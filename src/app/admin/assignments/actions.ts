"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/admin";
import { RULE_SLOTS, publishVersion, saveCourse, resetVersionLesson, saveRule, saveVersion, saveVersionLesson, setRuleStatus } from "@/server/assignment-admin";

/** Every privileged action checks admin rights first, before reading its input, so a non-admin never reaches the database. */
function ruleFromForm(form: FormData) {
  return {
    id: form.get("id") || undefined,
    name: String(form.get("name") ?? ""),
    description: String(form.get("description") ?? ""),
    status: String(form.get("status") ?? "draft"),
    priority: String(form.get("priority") ?? "0"),
    targetVersionId: String(form.get("targetVersionId") ?? ""),
    groupId: String(form.get("groupId") ?? ""),
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

export async function saveVersionLessonAction(form: FormData) {
  const { adminId } = await requireAdmin();
  const versionId = String(form.get("versionId") ?? "");
  const skillId = String(form.get("skillId") ?? "");
  const r = await saveVersionLesson(adminId, { versionId, skillId, body: String(form.get("body") ?? ""), minutes: String(form.get("minutes") ?? "") });
  revalidatePath("/admin/assignments", "layout");
  const here = `/admin/assignments/versions/${encodeURIComponent(versionId)}`;
  if (!r.ok) redirect(`${here}?error=${note(r.problems)}#${encodeURIComponent(skillId)}`);
  redirect(`${here}?saved=${encodeURIComponent(skillId)}#${encodeURIComponent(skillId)}`);
}

export async function resetVersionLessonAction(form: FormData) {
  const { adminId } = await requireAdmin();
  const versionId = String(form.get("versionId") ?? "");
  const skillId = String(form.get("skillId") ?? "");
  await resetVersionLesson(adminId, versionId, skillId);
  revalidatePath("/admin/assignments", "layout");
  redirect(`/admin/assignments/versions/${encodeURIComponent(versionId)}?reset=${encodeURIComponent(skillId)}#${encodeURIComponent(skillId)}`);
}

export async function publishVersionAction(form: FormData) {
  const { adminId } = await requireAdmin();
  const versionId = String(form.get("versionId") ?? "");
  const r = await publishVersion(adminId, versionId);
  revalidatePath("/admin/assignments", "layout");
  const here = `/admin/assignments/versions/${encodeURIComponent(versionId)}`;
  if (!r.ok) redirect(`${here}?error=${note(r.problems)}`);
  redirect(`${here}?${new URLSearchParams({ published: String(r.value.rules), checked: String(r.value.evaluated), changed: String(r.value.changed), ...(r.value.capped ? { capped: "1" } : {}) })}`);
}

export async function saveCourseAction(form: FormData) {
  const { adminId } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const r = await saveCourse(adminId, {
    id, title: String(form.get("title") ?? ""), chapterId: String(form.get("chapterId") ?? ""), skills: form.getAll("skills").map(String),
  });
  revalidatePath("/admin/assignments", "layout");
  if (!r.ok) redirect(`/admin/assignments/courses/${encodeURIComponent(id || "new")}?error=${note(r.problems)}`);
  redirect(`/admin/assignments/courses/${encodeURIComponent(r.value.id)}?${r.value.created ? "created" : "saved"}=1`);
}
