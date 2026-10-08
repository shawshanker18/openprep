import Link from "next/link";
import { eq } from "drizzle-orm";
import { localDate } from "@/engine/plan";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { satAttempts } from "@/db/schema";
import { SUBJECTS, TOPICS } from "@/content/taxonomy";
import { requireUser } from "@/server/auth";
import { signOut } from "@/app/auth/actions";
import { ThemeSelect } from "@/components/theme";
import { Reminders } from "./reminders";
import {
  addOfficialScore, deleteAccount, removeOfficialScore, retakeDiagnostic, updateProfile, updateSettings,
} from "./actions";
import { Choice } from "@/components/ui/choice";
import { DateField } from "@/components/ui/date-field";
import { SatDateField } from "@/components/sat-date-field";

export const metadata = { title: "Settings" };

const control = "h-9 rounded-md border bg-background px-2 text-sm";
const ERRORS: Record<string, string> = {
  settings: "Please check your settings and try again.",
  testdate: "Pick an upcoming test date: today or later, and within three years.",
  profile: "Please check your profile and try again.",
  score: "Each section score must be between 200 and 800 in steps of 10, with a date.",
  scores: "You can keep up to 20 official scores. Remove one to add another.",
  retake: "You can retake the diagnostic once every 30 days.",
  delete: "Type DELETE in capitals to confirm.",
};

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const sp = await searchParams;
  const { userId, profile } = await requireUser();
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

      <form id="goal" action={updateSettings} className="flex scroll-mt-20 flex-col gap-4">
        <h2 className="font-medium">Goal and schedule</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">Target score
            <input name="targetScore" type="number" min={400} max={1600} step={10} defaultValue={profile.targetScore ?? 1400} className={control} /></label>
          <label className="flex flex-col gap-1 text-sm">Test date
            <SatDateField name="testDate" defaultValue={profile.testDate} today={localDate(new Date(), profile.timezone)} /></label>
          <label className="flex flex-col gap-1 text-sm">Minutes per day
            <Choice name="minutesPerDay" defaultValue={String(profile.minutesPerDay)} options={[15, 30, 45, 60, 90, 120].map((m) => ({ value: String(m), label: `${m} minutes` }))} /></label>
          <label className="flex flex-col gap-1 text-sm">Days per week
            <Choice name="daysPerWeek" defaultValue={String(profile.daysPerWeek)} options={[3, 4, 5, 6, 7].map((d) => ({ value: String(d), label: `${d} days` }))} /></label>
        </div>
        <p className="text-xs text-muted-foreground">Changes apply from tomorrow&apos;s plan. Today&apos;s plan stays as it is.</p>
        <Button type="submit" className="self-start">Save</Button>
      </form>

      <Reminders hour={profile.reminderHour} />

      <form action={updateProfile} className="flex flex-col gap-4">
        <h2 className="font-medium">Profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">Grade
            <Choice name="grade" defaultValue={String(profile.grade ?? 11)} options={[...[8, 9, 10, 11, 12].map((g) => ({ value: String(g), label: `Grade ${g}` })), { value: "13", label: "Other / gap year" }]} /></label>
          <label className="flex flex-col gap-1 text-sm">School curriculum
            <Choice name="curriculum" defaultValue={profile.curriculum ?? "cbse"} options={[{ value: "cbse", label: "CBSE" }, { value: "icse", label: "ICSE" }, { value: "ib", label: "IB" }, { value: "gcse", label: "GCSE / A-Levels" }, { value: "american", label: "American" }, { value: "other", label: "Other" }]} /></label>
          <label className="flex flex-col gap-1 text-sm">English is my…
            <Choice name="englishBackground" defaultValue={profile.englishBackground ?? "fluent"} options={[{ value: "first_language", label: "First language" }, { value: "fluent", label: "Fluent second language" }, { value: "learning", label: "Still learning" }]} /></label>
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


      <section id="scores" className="flex scroll-mt-20 flex-col gap-3">
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
          <label className="flex flex-col gap-1 text-sm">Date<DateField name="takenOn" required max={new Date().toISOString().slice(0, 10)} className="w-40" /></label>
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
        <Link href="/privacy" className="self-start text-sm underline">Privacy Policy</Link>
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
