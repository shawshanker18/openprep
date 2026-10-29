import Link from "next/link";
import { localDate } from "@/engine/plan";
import { Button } from "@/components/ui/button";
import type { Profile, satAttempts } from "@/db/schema";
import { SUBJECTS, TOPICS } from "@/content/taxonomy";
import { asksChapters, asksSubjects } from "@/content/cbse-chapters";
import { CbseChapterPicker } from "@/components/cbse-chapter-picker";
import { Reminders } from "./reminders";
import {
  addOfficialScore, removeOfficialScore, retakeDiagnostic, updateProfile, updateSettings,
} from "./actions";
import { Choice } from "@/components/ui/choice";
import { DateField } from "@/components/ui/date-field";
import { SatDateField } from "@/components/sat-date-field";

const CARD = "flex min-w-0 flex-col gap-4 rounded-xl border p-5";
const PAIR = "grid items-stretch gap-6 lg:grid-cols-2";
const control = "h-9 rounded-md border bg-background px-2 text-sm";
const ERRORS: Record<string, string> = {
  settings: "Please check your settings and try again.",
  testdate: "Pick an upcoming test date: today or later, and within three years.",
  profile: "Please check your profile and try again.",
  score: "Each section score must be between 200 and 800 in steps of 10, with a date.",
  scores: "You can keep up to 20 official scores. Remove one to add another.",
  retake: "You can retake the diagnostic once every 30 days.",
};

export function SettingsView({ profile, scores, error, saved }: { profile: Profile; scores: (typeof satAttempts.$inferSelect)[]; error?: string; saved?: boolean }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Study settings</h1>
        <p className="text-muted-foreground">Your goal, schedule, school profile, scores and diagnostic. Theme, layout, plan and sign-out live in <Link href="/account" className="underline">Your account</Link>.</p>
      </header>
      {error && Object.hasOwn(ERRORS, error) && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{ERRORS[error]}</p>}
      {saved && <p role="status" className="rounded-md border p-3 text-sm">Saved.</p>}

      <div className={PAIR}>
      <form id="goal" action={updateSettings} className={`${CARD} scroll-mt-20`}>
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
        <Button type="submit" className="mt-auto self-start">Save goal and schedule</Button>
      </form>

      <Reminders hour={profile.reminderHour} />
      </div>

      <form action={updateProfile} className={CARD}>
        <h2 className="font-medium">Profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">Grade
            <Choice name="grade" defaultValue={String(profile.grade ?? 11)} options={[...[8, 9, 10, 11, 12].map((g) => ({ value: String(g), label: `Grade ${g}` })), { value: "13", label: "Other / gap year" }]} /></label>
          <label className="flex flex-col gap-1 text-sm">School curriculum
            <Choice name="curriculum" defaultValue={profile.curriculum ?? "cbse"} options={[{ value: "cbse", label: "CBSE" }, { value: "icse", label: "ICSE" }, { value: "ib", label: "IB" }, { value: "gcse", label: "GCSE / A-Levels" }, { value: "american", label: "American" }, { value: "other", label: "Other" }]} /></label>
          <label className="flex flex-col gap-1 text-sm">English is my…
            <Choice name="englishBackground" defaultValue={profile.englishBackground ?? "fluent"} options={[{ value: "first_language", label: "First language" }, { value: "fluent", label: "Fluent second language" }, { value: "learning", label: "Still learning" }]} /></label>
        </div>
        {asksSubjects(profile.curriculum, profile.grade) && (
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
        )}
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
        {asksChapters(profile.curriculum, profile.subjects) && (
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-2">Class 11 maths chapters you&apos;ve finished</legend>
            <CbseChapterPicker defaultChecked={profile.chaptersDone} />
            <div className="mt-2 flex flex-col gap-1 border-t pt-3">
              <label className="flex min-h-9 items-center gap-2">
                <input type="hidden" name="cbseReviewShown" value="1" />
                <input type="checkbox" name="cbseReview" defaultChecked={profile.cbseReview} /> CBSE-specific review for those chapters
              </label>
              <p className="text-xs text-muted-foreground sm:pl-6">On: shorter review lessons that recap what school covered and teach the rest for the SAT. Off: the standard lessons.</p>
            </div>
          </fieldset>
        )}
        <Button type="submit" className="self-start">Save profile</Button>
      </form>


      <div className={PAIR}>
      <section id="scores" className={`${CARD} scroll-mt-20`}>
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

      <section className={CARD}>
        <h2 className="font-medium">Diagnostic</h2>
        <p className="text-sm text-muted-foreground">Retaking adds new evidence to your profile; it doesn&apos;t reset anything. Once every 30 days.</p>
        <form action={retakeDiagnostic} className="mt-auto"><Button type="submit" variant="outline">Retake the diagnostic</Button></form>
      </section>
      </div>

    </div>
  );
}
