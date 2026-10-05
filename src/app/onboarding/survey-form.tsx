"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SUBJECTS } from "@/content/taxonomy";
import { submitSurvey } from "./actions";
import { Choice } from "@/components/ui/choice";
import { DateField } from "@/components/ui/date-field";
import { Survey } from "@/lib/onboarding";

const field = "flex flex-col gap-1.5 text-sm";
const control = "h-9 rounded-md border bg-background px-2 text-sm";

export function SurveyForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState(0);
  const [skipped, setSkipped] = useState<number[]>([]);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titles = ["Grade, curriculum and subjects", "English", "Your study goals"];
  const move = (next: number) => {
    setStep(next);
    requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: "start", behavior: "smooth" }); });
  };
  const [tookSat, setTookSat] = useState(false);
  const [target, setTarget] = useState(1400);
  const [unsureDate, setUnsureDate] = useState(false);

  const save = (skip: number[] = skipped) => {
    const f = new FormData(form.current!);
    const num = (k: string) => Number(f.get(k));
    const input = {
      grade: skip.includes(0) ? null : num("grade"),
      curriculum: skip.includes(0) ? null : f.get("curriculum"),
      subjects: skip.includes(0) ? [] : f.getAll("subjects"),
      topicsStudied: [],
      englishBackground: skip.includes(1) ? null : f.get("english"),
      ratings: {},
      prior: !skip.includes(2) && tookSat ? { math: num("priorMath"), rw: num("priorRw"), takenOn: String(f.get("priorDate")) } : null,
      targetScore: skip.includes(2) ? null : target,
      testDate: skip.includes(2) || unsureDate ? null : String(f.get("testDate")) || null,
      minutesPerDay: skip.includes(2) ? 45 : num("minutes"),
      daysPerWeek: skip.includes(2) ? 5 : num("days"),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    const parsed = Survey.safeParse(input);
    if (!parsed.success) { toast.error("Please check your answers before continuing."); return; }
    start(async () => {
      const res = await submitSurvey(parsed.data).catch(() => ({ ok: false as const, error: "Couldn't save your details. Your form is still here. Check your connection and try again." }));
      if (!res.ok) toast.error(res.error);
      else { router.push("/dashboard"); router.refresh(); }
    });
  };
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const answered = skipped.filter((s) => s !== step);
    setSkipped(answered);
    if (step < 2) move(step + 1);
    else save(answered);
  };
  const skip = () => {
    const next = [...new Set([...skipped, step])];
    setSkipped(next);
    if (step < 2) move(step + 1);
    else save(next);
  };

  return (
    <form ref={form} onSubmit={onSubmit} className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground" aria-live="polite">Step {step + 1} of {titles.length}</p>
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">{titles[step]}</h1>
        <p className="text-sm text-muted-foreground">Skip anything you’re unsure about. You can change your details later in Settings.</p>
        <div role="progressbar" aria-label="Onboarding progress" aria-valuemin={1} aria-valuemax={titles.length} aria-valuenow={step + 1} className="mt-4 flex gap-2">
          {titles.map((title, i) => <span key={title} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />)}
        </div>
      </div>
      <fieldset disabled={pending} className="contents">
      <div hidden={step !== 0}><div className="flex flex-col gap-6">
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

      </div></div>
      <div hidden={step !== 1}><div className="flex flex-col gap-6">
      <label className={field}>English is my…
        <Choice name="english" defaultValue="fluent" className="sm:w-72" options={[{ value: "first_language", label: "First language" }, { value: "fluent", label: "Fluent second language" }, { value: "learning", label: "Still learning" }]} />
      </label>

      </div></div>
      <div hidden={step !== 2}><div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={tookSat} onChange={(e) => setTookSat(e.target.checked)} /> I have taken the SAT before
        </label>
        {tookSat && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={field}>Math score<input name="priorMath" type="number" min={200} max={800} step={10} required={step === 2} disabled={step !== 2} className={control} /></label>
            <label className={field}>Reading &amp; Writing<input name="priorRw" type="number" min={200} max={800} step={10} required={step === 2} disabled={step !== 2} className={control} /></label>
            <label className={field}>Date taken<DateField name="priorDate" required={step === 2} disabled={step !== 2} max={new Date().toISOString().slice(0, 10)} /></label>
          </div>
        )}
      </fieldset>

      <label className={field}>
        <span>Target score: <b>{target}</b></span>
        <input type="range" min={1000} max={1600} step={10} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <label className={field}>Test date
          <DateField name="testDate" disabled={unsureDate || step !== 2} required={!unsureDate && step === 2} min={new Date().toISOString().slice(0, 10)} />
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

      </div></div>
      </fieldset>
      {step === 2 && <p className="text-sm text-muted-foreground">If you skip study goals, we’ll start with 45 minutes a day, 5 days a week. Your target score and test date will stay unset.</p>}
      <div className="flex flex-wrap gap-2">
        {step > 0 && <Button type="button" variant="outline" disabled={pending} onClick={() => move(step - 1)}>Back</Button>}
        <Button type="submit" size="lg" disabled={pending}>{pending ? "Saving…" : step === 2 ? "Finish setup" : "Next"}</Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={skip}>Skip this step</Button>
      </div>
    </form>
  );
}
