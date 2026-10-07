"use client";

import { upcomingSatDates } from "@/lib/sat-dates";

export function SatDateField({ name, defaultValue, required, disabled, today, emptyLabel = "Not sure yet" }: {
  name: string; defaultValue?: string | null; required?: boolean; disabled?: boolean; today?: string;
  /** Text of the empty choice. A required field says "Choose a date", since "Not sure yet" is not an answer it accepts. */
  emptyLabel?: string;
}) {
  const now = new Date();
  const localToday = today ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dates = upcomingSatDates(localToday);
  return <span className="flex flex-col gap-1">
    <select name={name} defaultValue={dates.some(d => d === defaultValue) ? defaultValue! : ""} required={required} disabled={disabled}
      className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50">
      <option value="">{emptyLabel}</option>
      {dates.map(date => <option key={date} value={date}>{new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</option>)}
    </select>
    <span className="text-xs text-muted-foreground">Official SAT Weekend dates. <a href="https://satsuite.collegeboard.org/sat/dates-deadlines" target="_blank" rel="noopener noreferrer" className="underline">Dates and registration deadlines</a></span>
  </span>;
}
