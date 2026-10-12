// One ring per measure, divided into Easy, Medium and Hard segments. Each segment's length is that level's share of the
// subject's total for the measure, and the centre shows the subject-wide value. Every value is also written in the legend,
// so no reading depends on colour alone. All charts share one fixed size.

export type Segment = {
  label: "Easy" | "Medium" | "Hard";
  /** The amount this level contributes to the whole ring (answers, correct answers, or timed seconds). */
  value: number;
  display: string;
  note: string;
};

const RADIUS = 46;
const STROKE = 14;
const C = 2 * Math.PI * RADIUS;
/**
 * Each arc is trimmed by this much at both ends. The round caps add back STROKE / 2 at each end, so neighbouring
 * segments end up about 4 units apart, a small gap between colours with both ends rounded.
 */
const TRIM = 9;
/** Easy is green, Medium yellow, Hard red, in every chart. */
const TONE: Record<Segment["label"], { stroke: string; swatch: string }> = {
  Easy: { stroke: "stroke-green-600", swatch: "bg-green-600" },
  Medium: { stroke: "stroke-yellow-500", swatch: "bg-yellow-500" },
  Hard: { stroke: "stroke-red-600", swatch: "bg-red-600" },
};

export function DifficultyRing({ title, segments, centerValue, centerLabel }: {
  title: string; segments: [Segment, Segment, Segment]; centerValue: string; centerLabel: string;
}) {
  const total = segments.reduce((n, s) => n + Math.max(0, s.value), 0);
  const lengths = segments.map((s) => (total > 0 ? Math.max(0, s.value) / total : 0));
  const arcs = segments.map((s, i) => ({ s, len: lengths[i]!, start: lengths.slice(0, i).reduce((n, x) => n + x, 0) }));
  const summary = `${centerLabel} ${centerValue}; ` + segments.map((s) => `${s.label} ${s.display}`).join(", ");
  return (
    <figure className="flex h-full min-w-0 flex-col gap-2 rounded-xl border p-3">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      <div className="flex items-start gap-3">
        <div className="relative size-28 shrink-0" role="img" aria-label={`${title}: ${summary}`}>
          <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-muted" />
            {arcs.map(({ s, len, start: at }) => len > 0 && (
              <circle key={s.label} cx="60" cy="60" r={RADIUS} fill="none" strokeWidth={STROKE} strokeLinecap="round" className={TONE[s.label].stroke}
                strokeDasharray={`${Math.max(0, len * C - 2 * TRIM)} ${C}`} strokeDashoffset={-(at * C + TRIM)} />
            ))}
          </svg>
          <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-semibold tabular-nums">{centerValue}</span>
            <span className="text-[10px] leading-tight text-muted-foreground">{centerLabel}</span>
          </div>
        </div>
        <dl className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
          {segments.map((r) => (
            <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2">
              <dt className="flex min-w-0 items-start gap-2">
                <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${TONE[r.label].swatch}`} />
                <span className="min-w-0">{r.label}<span className="block text-xs text-muted-foreground">{r.note}</span></span>
              </dt>
              <dd className="text-right font-medium tabular-nums">{r.display}</dd>
            </div>
          ))}
        </dl>
      </div>
    </figure>
  );
}
