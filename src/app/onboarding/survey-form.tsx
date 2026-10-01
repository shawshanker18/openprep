"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TOPICS } from "@/content/taxonomy";
import { submitSurvey } from "./actions";

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
          <select name="grade" defaultValue="11" className={control}>
            {[8, 9, 10, 11, 12].map((g) => <option key={g} value={g}>Grade {g}</option>)}
            <option value="13">Other / gap year</option>
          </select>
        </label>
        <label className={field}>School curriculum
          <select name="curriculum" defaultValue="cbse" className={control}>
            <option value="cbse">CBSE</option><option value="icse">ICSE</option><option value="ib">IB</option>
            <option value="gcse">GCSE / A-Levels</option><option value="american">American</option><option value="other">Other</option>
          </select>
        </label>
      </div>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-2">Which of these have you studied in school?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TOPICS.map((t) => (
            <label key={t.id} className="flex items-center gap-2">
              <input type="checkbox" name="topics" value={t.id} /> {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className={field}>English is my…
        <select name="english" defaultValue="fluent" className={control}>
          <option value="first_language">First language</option>
          <option value="fluent">Fluent second language</option>
          <option value="learning">Still learning</option>
        </select>
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={tookSat} onChange={(e) => setTookSat(e.target.checked)} /> I have taken the SAT before
        </label>
        {tookSat && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={field}>Math score<input name="priorMath" type="number" min={200} max={800} step={10} required className={control} /></label>
            <label className={field}>Reading &amp; Writing<input name="priorRw" type="number" min={200} max={800} step={10} required className={control} /></label>
            <label className={field}>Date taken<input name="priorDate" type="date" required className={control} /></label>
          </div>
        )}
      </fieldset>

      <label className={field}>
        <span>Target score: <b>{target}</b></span>
        <input type="range" min={1000} max={1600} step={10} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <label className={field}>Test date
          <input name="testDate" type="date" disabled={unsureDate} required={!unsureDate} className={control}
            min={new Date().toISOString().slice(0, 10)} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={unsureDate} onChange={(e) => setUnsureDate(e.target.checked)} /> Not sure yet
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>Study time per day
          <select name="minutes" defaultValue="45" className={control}>
            {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </label>
        <label className={field}>Days per week
          <select name="days" defaultValue="5" className={control}>
            {[3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
        </label>
      </div>

      <Button type="submit" size="lg" disabled={pending}>{pending ? "Saving…" : "Continue"}</Button>
    </form>
  );
}
