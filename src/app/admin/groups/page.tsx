import Link from "next/link";
import { requireAdmin } from "@/server/admin";
import { input, label } from "@/app/admin/form-styles";
import { listGroups } from "@/server/groups";
import { saveGroupAction } from "./actions";

export const metadata = { title: "Groups" };

export default async function GroupsPage({ searchParams }: PageProps<"/admin/groups">) {
  await requireAdmin();
  const sp = await searchParams;
  const groups = await listGroups();
  const error = typeof sp.error === "string" ? sp.error : null;
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">User groups</h1>
        <p className="text-sm text-muted-foreground">A group is a named set of students, such as a class or a pilot cohort. In Course assignment, a rule can be limited to a group so its members get a particular course version.</p>
      </header>
      {sp.deleted && <p role="status" className="rounded-md border p-3 text-sm">Group deleted.</p>}
      {error && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}

      {groups.length === 0 ? <p className="text-sm text-muted-foreground">No groups yet.</p> : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {groups.map((g) => (
            <li key={g.id} className="flex flex-wrap items-baseline justify-between gap-2 p-4 text-sm">
              <span><Link href={`/admin/groups/${g.id}`} className="font-medium underline underline-offset-4">{g.name}</Link>{g.description && <span className="text-muted-foreground"> · {g.description}</span>}</span>
              <span className="tabular-nums text-muted-foreground">{g.members} member{g.members === 1 ? "" : "s"}</span>
            </li>
          ))}
        </ul>
      )}

      <form action={saveGroupAction} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2" aria-label="Create a group">
        <label className={label}>Name<input name="name" required maxLength={80} className={input} /></label>
        <label className={label}>Notes (optional)<input name="description" maxLength={500} className={input} /></label>
        <div className="sm:col-span-2"><button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Create group</button></div>
      </form>
    </div>
  );
}
