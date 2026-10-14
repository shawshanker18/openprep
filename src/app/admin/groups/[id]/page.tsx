import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assignmentRules, userGroups } from "@/db/schema";
import { requireAdmin, userEmails } from "@/server/admin";
import { input, label } from "@/app/admin/form-styles";
import { groupMemberIds } from "@/server/groups";
import { addMembersAction, deleteGroupAction, removeMemberAction, saveGroupAction } from "../actions";

export const metadata = { title: "Group" };

export default async function GroupPage({ params, searchParams }: PageProps<"/admin/groups/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [group] = await db.select().from(userGroups).where(eq(userGroups.id, id));
  if (!group) notFound();
  const sp = await searchParams;
  const [members, rules] = await Promise.all([
    groupMemberIds(id),
    db.select({ id: assignmentRules.id, name: assignmentRules.name, status: assignmentRules.status }).from(assignmentRules).where(eq(assignmentRules.groupId, id)),
  ]);
  const emails = await userEmails(members.map((m) => m.userId));
  const error = typeof sp.error === "string" ? sp.error : null;
  const added = typeof sp.added === "string" ? `Added ${sp.added} student${sp.added === "1" ? "" : "s"}${sp.already && sp.already !== "0" ? `; ${sp.already} already in the group` : ""}. Their courses were re-checked.` : null;

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/groups" className="text-sm text-muted-foreground underline">← Groups</Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{group.name}</h1>
        <p className="text-sm text-muted-foreground">{members.length} member{members.length === 1 ? "" : "s"}</p>
      </header>
      {sp.saved && <p role="status" className="rounded-md border p-3 text-sm">Saved.</p>}
      {sp.removed && <p role="status" className="rounded-md border p-3 text-sm">Removed. Their courses were re-checked.</p>}
      {added && <p role="status" className="rounded-md border p-3 text-sm">{added}</p>}
      {typeof sp.missing === "string" && <p role="alert" className="rounded-md border border-amber-500/50 p-3 text-sm">No OpenPrep account found for: {sp.missing}. They need to sign in once first.</p>}
      {sp.many && <p role="alert" className="rounded-md border border-amber-500/50 p-3 text-sm">Only the first 500 emails were used. Add the rest in another batch.</p>}
      {error && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}

      <section aria-labelledby="members" className="flex flex-col gap-3">
        <h2 id="members" className="font-medium">Members</h2>
        {members.length === 0 ? <p className="text-sm text-muted-foreground">No members yet.</p> : (
          <ul className="flex flex-col divide-y rounded-xl border">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-3 p-3 text-sm">
                <Link href={`/admin/users/${m.userId}`} className="underline underline-offset-4">{emails.get(m.userId)?.email ?? m.userId}</Link>
                <form action={removeMemberAction}>
                  <input type="hidden" name="id" value={id} /><input type="hidden" name="userId" value={m.userId} />
                  <button type="submit" className="min-h-11 rounded-md border px-3 text-sm hover:bg-muted">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addMembersAction} className="flex flex-col gap-3 rounded-xl border p-4" aria-label="Add members">
          <input type="hidden" name="id" value={id} />
          <label className={label}>Add students by email
            <textarea name="emails" required rows={5} placeholder={"one@example.com\ntwo@example.com"} className="rounded-md border bg-background p-3 text-sm font-normal" />
            <span className="text-xs font-normal text-muted-foreground">One per line (commas work too), up to 500 at a time. Each student must have signed in to OpenPrep once. Adding students re-checks their courses straight away.</span>
          </label>
          <div><button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Add to group</button></div>
        </form>
      </section>

      <section aria-labelledby="rules" className="flex flex-col gap-2">
        <h2 id="rules" className="font-medium">Rules for this group</h2>
        {rules.length === 0 ? <p className="text-sm text-muted-foreground">No rule uses this group yet. Create one in <Link href="/admin/assignments/rules/new" className="underline">Course assignment</Link> and choose this group.</p> : (
          <ul className="list-disc pl-5 text-sm">{rules.map((r) => <li key={r.id}><Link href={`/admin/assignments/rules/${r.id}`} className="underline underline-offset-4">{r.name}</Link> <span className="text-muted-foreground">({r.status})</span></li>)}</ul>
        )}
      </section>

      <section aria-labelledby="edit" className="flex flex-col gap-3">
        <h2 id="edit" className="font-medium">Rename</h2>
        <form action={saveGroupAction} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={id} />
          <label className={label}>Name<input name="name" required maxLength={80} defaultValue={group.name} className={input} /></label>
          <label className={label}>Notes<input name="description" maxLength={500} defaultValue={group.description} className={input} /></label>
          <div className="sm:col-span-2"><button type="submit" className="min-h-11 rounded-md border px-4 text-sm font-medium hover:bg-muted">Save</button></div>
        </form>
        <form action={deleteGroupAction} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={id} />
          <p className="text-sm text-muted-foreground">A group that a rule uses cannot be deleted. Remove or change those rules first.</p>
          <button type="submit" className="min-h-11 self-start rounded-md border border-destructive/40 px-4 text-sm font-medium text-destructive hover:bg-muted">Delete group</button>
        </form>
      </section>
    </div>
  );
}
