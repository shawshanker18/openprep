"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SUBJECTS, TOPICS } from "@/content/taxonomy";
import { submitSurvey } from "./actions";
import { Choice } from "@/components/ui/choice";
import { DateField } from "@/components/ui/date-field";

const field = "flex flex-col gap-1.5 text-sm";
const control = "h-9 rounded-md border bg-background px-2 text-sm";

export function SurveyForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tookSat, setTookSat] = useState(false);
  const [target, setTarget] = useState(1400);
  const [unsureDate, setUnsureDate] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => Number(f.get(k));
    start(async () => {
      const res = await submitSurvey({
        grade: num("grade"),
        curriculum: f.get("curriculum") as "cbse",
        topicsStudied: f.getAll("topics") as string[],
        subjects: f.getAll("subjects") as (typeof SUBJECTS)[number][],
        englishBackground: f.get("english") as "fluent",
        prior: tookSat ? { math: num("priorMath"), rw: num("priorRw"), takenOn: String(f.get("priorDate")) } : null,
        targetScore: target,
        testDate: unsureDate ? null : String(f.get("testDate")) || null,
        minutesPerDay: num("minutes"),
        daysPerWeek: num("days"),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>Grade
          <Choice name="grade" defaultValue="11" options={[...[8, 9, 10, 11, 12].map((g) => ({ value: String(g), label: `Grade ${g}` })), { value: "13", label: "Other / gap year" }]} />
        </label>
        <label className={field}>School curriculum
          <Choice name="curriculum" defaultValue="cbse" options={[{ value: "cbse", label: "CBSE" }, { value: "icse", label: "ICSE" }, { value: "ib", label: "IB" }, { value: "gcse", label: "GCSE / A-Levels" }, { value: "american", label: "American" }, { value: "other", label: "Other" }]} />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-2">Subjects you&apos;re studying now</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {SUBJECTS.map((s) => <label key={s} className="flex items-center gap-2"><input type="checkbox" name="subjects" value={s} /> {s}</label>)}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-2">Which math chapters have you already studied?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TOPICS.map((t) => (
            <label key={t.id} className="flex items-center gap-2">
              <input type="checkbox" name="topics" value={t.id} /> {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className={field}>English is my…
        <Choice name="english" defaultValue="fluent" className="sm:w-72" options={[{ value: "first_language", label: "First language" }, { value: "fluent", label: "Fluent second language" }, { value: "learning", label: "Still learning" }]} />
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={tookSat} onChange={(e) => setTookSat(e.target.checked)} /> I have taken the SAT before
        </label>
        {tookSat && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={field}>Math score<input name="priorMath" type="number" min={200} max={800} step={10} required className={control} /></label>
            <label className={field}>Reading &amp; Writing<input name="priorRw" type="number" min={200} max={800} step={10} required className={control} /></label>
            <label className={field}>Date taken<DateField name="priorDate" required max={new Date().toISOString().slice(0, 10)} /></label>
          </div>
        )}
      </fieldset>

      <label className={field}>
        <span>Target score: <b>{target}</b></span>
        <input type="range" min={1000} max={1600} step={10} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <label className={field}>Test date
          <DateField name="testDate" disabled={unsureDate} required={!unsureDate} min={new Date().toISOString().slice(0, 10)} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={unsureDate} onChange={(e) => setUnsureDate(e.target.checked)} /> Not sure yet
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>Study time per day
          <Choice name="minutes" defaultValue="45" options={[15, 30, 45, 60, 90, 120].map((m) => ({ value: String(m), label: `${m} minutes` }))} />
        </label>
        <label className={field}>Days per week
          <Choice name="days" defaultValue="5" options={[3, 4, 5, 6, 7].map((d) => ({ value: String(d), label: `${d} days` }))} />
        </label>
      </div>

      <Button type="submit" size="lg" disabled={pending}>{pending ? "Saving…" : "Continue"}</Button>
    </form>
  );
}
