import { CBSE_CHAPTERS } from "@/content/cbse-chapters";
import { input, label } from "@/app/admin/form-styles";
import { RULE_SLOTS } from "@/server/assignment-admin";
import { saveRuleAction } from "./actions";

export type RuleFormValues = {
  id?: string; name: string; description: string; status: "draft" | "live" | "disabled"; priority: number;
  targetVersionId: string; op: "all" | "any"; chapters: string[]; groupId?: string; effectiveFrom?: string; effectiveUntil?: string;
};
export type VersionOption = { id: string; name: string; published: boolean };
export type GroupOption = { id: string; name: string };

const iso = (v?: string) => (v ? v.slice(0, 16) : "");

export function RuleForm({ values, versions, groups, error }: { values: RuleFormValues; versions: VersionOption[]; groups: GroupOption[]; error?: string }) {
  const grades = [9, 10, 11, 12] as const;
  const slots = Array.from({ length: RULE_SLOTS }, (_, i) => values.chapters[i] ?? "");
  return (
    <form action={saveRuleAction} className="flex flex-col gap-6" aria-describedby={error ? "rule-error" : undefined}>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {error && <p id="rule-error" role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Name<input name="name" required maxLength={120} defaultValue={values.name} className={input} /></label>
        <label className={label}>Status
          <select name="status" defaultValue={values.status} className={input}>
            <option value="draft">Draft: saved, not applied</option>
            <option value="live">Live: applies to students</option>
            <option value="disabled">Disabled: kept for history</option>
          </select>
        </label>
        <label className={label}>Priority<input name="priority" type="number" min={-1000} max={1000} defaultValue={values.priority} className={input} aria-describedby="priority-help" />
          <span id="priority-help" className="text-xs font-normal text-muted-foreground">Higher wins when several rules match. Equal priorities are a warning.</span></label>
        <label className={label}>Course version
          <select name="targetVersionId" required defaultValue={values.targetVersionId} className={input}>
            <option value="">Choose a version</option>
            {versions.map((v) => <option key={v.id} value={v.id}>{v.name}{v.published ? "" : " (not published)"}</option>)}
          </select>
        </label>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Who it applies to</legend>
        <label className={label}>User group
          <select name="groupId" defaultValue={values.groupId ?? ""} className={`${input} sm:max-w-sm`}>
            <option value="">Every student</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <span className="text-xs font-normal text-muted-foreground">Choose a group to limit the rule to its members. With a group you can leave the chapters empty to give the whole group the same version.</span>
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Completed chapters (optional with a group)</legend>
        <label className={label}>Match students who have completed
          <select name="op" defaultValue={values.op} className={`${input} sm:max-w-sm`}>
            <option value="all">All of these chapters</option>
            <option value="any">Any of these chapters</option>
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {slots.map((value, i) => (
            <label key={i} className={label}>Chapter {i + 1}
              <select name={`chapter${i}`} defaultValue={value} className={input}>
                <option value="">Not used</option>
                {grades.map((g) => (
                  <optgroup key={g} label={`Class ${g}`}>
                    {CBSE_CHAPTERS.filter((c) => c.grade === g).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Applies from (UTC, optional)<input name="effectiveFrom" type="datetime-local" defaultValue={iso(values.effectiveFrom)} className={input} /></label>
        <label className={label}>Applies until (UTC, optional)<input name="effectiveUntil" type="datetime-local" defaultValue={iso(values.effectiveUntil)} className={input} /></label>
      </div>

      <label className={label}>Notes for admins<textarea name="description" maxLength={500} defaultValue={values.description} className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm font-normal" /></label>

      <button type="submit" className="min-h-11 self-start rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground">Save rule</button>
    </form>
  );
}
