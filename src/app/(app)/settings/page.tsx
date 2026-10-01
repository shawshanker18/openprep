import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { satAttempts } from "@/db/schema";
import { SUBJECTS, TOPICS } from "@/content/taxonomy";
import { requireUser } from "@/server/auth";
import { DASHBOARD_CARDS, dashboardLayout } from "@/server/daily";
import { signOut } from "@/app/auth/actions";
import { ThemeSelect } from "@/components/theme";
import { Reminders } from "./reminders";
import {
  addOfficialScore, deleteAccount, removeOfficialScore, resetDashboard, retakeDiagnostic, saveDashboard, updateProfile, updateSettings,
} from "./actions";

export const metadata = { title: "Settings" };

const control = "h-9 rounded-md border bg-background px-2 text-sm";
const ERRORS: Record<string, string> = {
  settings: "Please check your settings and try again.",
  profile: "Please check your profile and try again.",
  dashboard: "Couldn't save the dashboard layout. Please try again.",
  score: "Each section score must be between 200 and 800 in steps of 10, with a date.",
  scores: "You can keep up to 20 official scores. Remove one to add another.",
  retake: "You can retake the diagnostic once every 30 days.",
  delete: "Type DELETE in capitals to confirm.",
};

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const sp = await searchParams;
  const { userId, profile } = await requireUser();
  const layout = dashboardLayout(profile);
  const cards = layout ?? DASHBOARD_CARDS.map((c) => ({ id: c.id, visible: true }));
  const cardLabel = (id: string) => DASHBOARD_CARDS.find((c) => c.id === id)!.label;
  const scores = await db.select().from(satAttempts).where(eq(satAttempts.userId, userId)).orderBy(satAttempts.takenOn);

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Appearance</h2>
        <ThemeSelect />
        <p className="text-xs text-muted-foreground">System follows your device. Saved in this browser.</p>
      </section>
      {typeof sp.error === "string" && Object.hasOwn(ERRORS, sp.error) && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{ERRORS[sp.error]}</p>}
      {sp.saved && <p role="status" className="rounded-md border p-3 text-sm">Saved.</p>}

      <form action={updateSettings} className="flex flex-col gap-4">
        <h2 className="font-medium">Goal and schedule</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">Target score
            <input name="targetScore" type="number" min={400} max={1600} step={10} defaultValue={profile.targetScore ?? 1400} className={control} /></label>
          <label className="flex flex-col gap-1 text-sm">Test date
            <input name="testDate" type="date" defaultValue={profile.testDate ?? ""} className={control} /></label>
          <label className="flex flex-col gap-1 text-sm">Minutes per day
            <select name="minutesPerDay" defaultValue={profile.minutesPerDay} className={control}>
              {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select></label>
          <label className="flex flex-col gap-1 text-sm">Days per week
            <select name="daysPerWeek" defaultValue={profile.daysPerWeek} className={control}>
              {[3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{d} days</option>)}
            </select></label>
        </div>
        <p className="text-xs text-muted-foreground">Changes apply from tomorrow&apos;s plan. Today&apos;s plan stays as it is.</p>
        <Button type="submit" className="self-start">Save</Button>
      </form>

      <Reminders hour={profile.reminderHour} />

      <form action={updateProfile} className="flex flex-col gap-4">
        <h2 className="font-medium">Profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">Grade
            <select name="grade" defaultValue={profile.grade ?? 11} className={control}>
              {[8, 9, 10, 11, 12].map((g) => <option key={g} value={g}>Grade {g}</option>)}
              <option value="13">Other / gap year</option>
            </select></label>
          <label className="flex flex-col gap-1 text-sm">School curriculum
            <select name="curriculum" defaultValue={profile.curriculum ?? "cbse"} className={control}>
              <option value="cbse">CBSE</option><option value="icse">ICSE</option><option value="ib">IB</option>
              <option value="gcse">GCSE / A-Levels</option><option value="american">American</option><option value="other">Other</option>
            </select></label>
          <label className="flex flex-col gap-1 text-sm">English is my…
            <select name="englishBackground" defaultValue={profile.englishBackground ?? "fluent"} className={control}>
              <option value="first_language">First language</option>
              <option value="fluent">Fluent second language</option>
              <option value="learning">Still learning</option>
            </select></label>
        </div>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-2">Subjects you&apos;re studying now</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {SUBJECTS.map((s) => (
              <label key={s} className="flex items-center gap-2">
                <input type="checkbox" name="subjects" value={s} defaultChecked={profile.subjects.includes(s)} /> {s}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-2">Math chapters you&apos;ve studied</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {TOPICS.map((t) => (
              <label key={t.id} className="flex items-center gap-2">
                <input type="checkbox" name="topicsStudied" value={t.id} defaultChecked={profile.topicsStudied.includes(t.id)} /> {t.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" className="self-start">Save profile</Button>
      </form>

      <form action={saveDashboard} className="flex flex-col gap-3">
        <h2 className="font-medium">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          {layout ? "Custom layout." : "Automatic layout (recommended)."} Choose which cards show and their order.
        </p>
        <ul className="flex flex-col gap-1 text-sm">
          {cards.map((c, i) => (
            <li key={c.id} className="flex items-center justify-between gap-2">
              <input type="hidden" name="order" value={c.id} />
              <label className="flex items-center gap-2">
                <input type="checkbox" name="visible" value={c.id} defaultChecked={c.visible} /> {cardLabel(c.id)}
              </label>
              <span className="flex gap-1">
                <Button size="sm" variant="ghost" type="submit" name="move" value={`${c.id}:-1`} disabled={i === 0} aria-label={`Move ${cardLabel(c.id)} up`}>▲</Button>
                <Button size="sm" variant="ghost" type="submit" name="move" value={`${c.id}:1`} disabled={i === cards.length - 1} aria-label={`Move ${cardLabel(c.id)} down`}>▼</Button>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button type="submit" variant="outline">Save layout</Button>
          {layout && <Button type="submit" variant="ghost" formAction={resetDashboard}>Reset to automatic</Button>}
        </div>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Official SAT scores</h2>
        {scores.length ? (
          <ul className="flex flex-col gap-1 text-sm">
            {scores.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span className="tabular-nums">{s.takenOn} · Math {s.math} · R&amp;W {s.rw} · Total {s.math + s.rw}</span>
                <form action={removeOfficialScore.bind(null, s.id)}><Button size="sm" variant="ghost" type="submit">Remove</Button></form>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">None yet.</p>}
        <form action={addOfficialScore} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">Date<input name="takenOn" type="date" required className={control} /></label>
          <label className="flex flex-col gap-1 text-sm">Math<input name="math" type="number" min={200} max={800} step={10} required className={`${control} w-24`} /></label>
          <label className="flex flex-col gap-1 text-sm">R&amp;W<input name="rw" type="number" min={200} max={800} step={10} required className={`${control} w-24`} /></label>
          <Button type="submit" variant="outline">Add</Button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Diagnostic</h2>
        <p className="text-sm text-muted-foreground">Retaking adds new evidence to your profile; it doesn&apos;t reset anything. Once every 30 days.</p>
        <form action={retakeDiagnostic}><Button type="submit" variant="outline">Retake the diagnostic</Button></form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Account</h2>
        <form action={signOut}><Button type="submit" variant="outline">Sign out</Button></form>
        <form action={deleteAccount} className="mt-4 flex flex-col gap-2 rounded-lg border border-destructive/40 p-4">
          <h3 className="text-sm font-medium">Delete my account</h3>
          <p className="text-sm text-muted-foreground">Permanently deletes your account and all your answers, scores and plans. This can&apos;t be undone.</p>
          <label className="flex flex-col gap-1 text-sm">Type DELETE to confirm
            <input name="confirm" autoComplete="off" required className={`${control} w-40`} /></label>
          <Button type="submit" variant="destructive" className="self-start">Delete account</Button>
        </form>
      </section>
    </div>
  );
}
