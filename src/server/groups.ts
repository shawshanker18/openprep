// User groups: named sets of students that a course assignment rule can be limited to (a class, a cohort, a pilot).
// Callers must have checked admin rights already (see app/admin/groups/actions.ts). Changing who is in a group
// re-checks those students' courses straight away, so a rule scoped to the group takes effect without a manual run.
import "server-only";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assignmentRules, profiles, userGroupMembers, userGroups } from "@/db/schema";
import { audit, userDirectory } from "@/server/admin";
import { refreshCourseAssignment } from "@/server/course-assignment";

export type Problem = { field: string; message: string };
type Ok<T> = { ok: true; value: T } | { ok: false; problems: Problem[] };

export const MAX_ADD_AT_ONCE = 500;

const Group = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Give the group a name").max(80, "Keep the name under 80 characters"),
  description: z.string().trim().max(500).default(""),
});

/** Create a group, or rename/describe an existing one. Names are unique ignoring case. */
export async function saveGroup(adminId: string, form: unknown): Promise<Ok<{ id: string }>> {
  const parsed = Group.safeParse(form);
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "form"), message: i.message })) };
  const { id, name, description } = parsed.data;
  const [clash] = await db.select({ id: userGroups.id }).from(userGroups).where(sql`lower(${userGroups.name}) = lower(${name})`);
  if (clash && clash.id !== id) return { ok: false, problems: [{ field: "name", message: "A group with that name already exists" }] };
  if (id) {
    const [updated] = await db.update(userGroups).set({ name, description, updatedAt: new Date() }).where(eq(userGroups.id, id)).returning({ id: userGroups.id });
    if (!updated) return { ok: false, problems: [{ field: "id", message: "Group not found" }] };
    await audit(adminId, "user_group.update", id, { name });
    return { ok: true, value: { id } };
  }
  const [created] = await db.insert(userGroups).values({ name, description, createdBy: adminId }).returning({ id: userGroups.id });
  await audit(adminId, "user_group.create", created!.id, { name });
  return { ok: true, value: { id: created!.id } };
}

/** Delete a group. Refused while any rule (even a disabled one) names it, so a rule never silently widens to everyone. */
export async function deleteGroup(adminId: string, id: string): Promise<Ok<{ members: number }>> {
  const [used] = await db.select({ n: count() }).from(assignmentRules).where(eq(assignmentRules.groupId, id));
  if (used!.n > 0) return { ok: false, problems: [{ field: "id", message: `${used!.n} rule${used!.n === 1 ? " uses" : "s use"} this group. Change or delete ${used!.n === 1 ? "it" : "them"} first.` }] };
  const [members] = await db.select({ n: count() }).from(userGroupMembers).where(eq(userGroupMembers.groupId, id));
  const gone = await db.delete(userGroups).where(eq(userGroups.id, id)).returning({ id: userGroups.id });
  if (!gone.length) return { ok: false, problems: [{ field: "id", message: "Group not found" }] };
  await audit(adminId, "user_group.delete", id, { members: members!.n });
  return { ok: true, value: { members: members!.n } };
}

/** Add students to a group by user id. Unknown ids are skipped and counted. Those students are re-checked at once. */
export async function addMembers(adminId: string, groupId: string, userIds: string[]): Promise<Ok<{ added: number; skipped: number }>> {
  const [group] = await db.select({ id: userGroups.id }).from(userGroups).where(eq(userGroups.id, groupId));
  if (!group) return { ok: false, problems: [{ field: "id", message: "Group not found" }] };
  const wanted = [...new Set(userIds)].slice(0, MAX_ADD_AT_ONCE);
  if (!wanted.length) return { ok: true, value: { added: 0, skipped: 0 } };
  const real = (await db.select({ id: profiles.id }).from(profiles).where(inArray(profiles.id, wanted))).map((p) => p.id);
  const inserted = real.length
    ? await db.insert(userGroupMembers).values(real.map((userId) => ({ groupId, userId, addedBy: adminId }))).onConflictDoNothing().returning({ userId: userGroupMembers.userId })
    : [];
  if (inserted.length) await audit(adminId, "user_group.add_members", groupId, { added: inserted.length });
  for (const m of inserted) await refreshCourseAssignment(m.userId);
  return { ok: true, value: { added: inserted.length, skipped: wanted.length - real.length } };
}

export async function removeMember(adminId: string, groupId: string, userId: string): Promise<Ok<{ removed: boolean }>> {
  const gone = await db.delete(userGroupMembers).where(and(eq(userGroupMembers.groupId, groupId), eq(userGroupMembers.userId, userId))).returning({ userId: userGroupMembers.userId });
  if (gone.length) {
    await audit(adminId, "user_group.remove_member", groupId, { userId });
    await refreshCourseAssignment(userId);
  }
  return { ok: true, value: { removed: gone.length > 0 } };
}

export async function listGroups() {
  return db.select({ id: userGroups.id, name: userGroups.name, description: userGroups.description, createdAt: userGroups.createdAt, members: count(userGroupMembers.userId) })
    .from(userGroups).leftJoin(userGroupMembers, eq(userGroupMembers.groupId, userGroups.id)).groupBy(userGroups.id).orderBy(asc(userGroups.name));
}

export async function groupMemberIds(groupId: string) {
  return (await db.select({ userId: userGroupMembers.userId, addedAt: userGroupMembers.addedAt }).from(userGroupMembers)
    .where(eq(userGroupMembers.groupId, groupId)).orderBy(asc(userGroupMembers.addedAt)).limit(1000));
}

/** Emails pasted by an admin (one per line, commas or spaces also work) turned into user ids. Unknown emails are returned, not guessed. */
export async function userIdsByEmail(raw: string): Promise<{ ids: string[]; missing: string[]; tooMany: boolean }> {
  const emails = [...new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")))];
  const ids: string[] = [], missing: string[] = [];
  for (const email of emails.slice(0, MAX_ADD_AT_ONCE)) {
    const hit = (await userDirectory(email, 5, 0)).find((u) => u.email?.toLowerCase() === email);
    if (hit) ids.push(hit.id); else missing.push(email);
  }
  return { ids, missing, tooMany: emails.length > MAX_ADD_AT_ONCE };
}

