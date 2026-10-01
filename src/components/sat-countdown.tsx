"use client";

import { useEffect, useState } from "react";

/** Live days/hrs/min until 8:00 on test day in the student's timezone (SAT check-in is early morning). */
export function SatCountdown({ testDate, timeZone }: { testDate: string; timeZone: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0); // client clock only after mount (avoids hydration mismatch)
    const t = setInterval(tick, 30_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);

  // 08:00 local on the test date, converted to UTC using the timezone's offset that day.
  const guess = new Date(`${testDate}T08:00:00Z`);
  const local = new Date(guess.toLocaleString("en-US", { timeZone }));
  const target = guess.getTime() - (local.getTime() - guess.getTime());

  const left = now == null ? null : Math.max(0, target - now);
  const d = left == null ? null : Math.floor(left / 86_400_000);
  const h = left == null ? null : Math.floor((left % 86_400_000) / 3_600_000);
  const m = left == null ? null : Math.floor((left % 3_600_000) / 60_000);
  const cell = (v: number | null, label: string, pad = true) => (
    <div className="flex w-14 flex-col items-center">
      <span className="text-3xl tabular-nums">{v == null ? "–" : pad ? String(v).padStart(2, "0") : v}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-3" role="timer" aria-label={d == null ? "SAT countdown" : `${d} days ${h} hours ${m} minutes until your SAT`}>
      {cell(d, "days", false)}{cell(h, "hrs")}{cell(m, "min")}
    </div>
  );
}
