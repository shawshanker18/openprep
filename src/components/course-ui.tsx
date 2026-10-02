// Small shared pieces for the course pages (server components).
import { Button } from "@/components/ui/button";
import { startTestAction } from "@/app/(app)/tests/actions";
import { LEVELS, LEVEL_BY_ID, type Level } from "@/engine/course";

const LEVEL_STYLE: Record<Level, string> = {
  mastered: "bg-primary border-primary",
  proficient: "bg-primary/70 border-primary/70",
  familiar: "bg-primary/40 border-primary/40",
  attempted: "bg-primary/10 border-primary/50",
  "not-started": "bg-transparent border-border",
};

export function LevelBox({ level, title, className = "size-4" }: { level: Level; title?: string; className?: string }) {
  return <span title={title ?? LEVEL_BY_ID[level].label} className={`inline-block shrink-0 rounded-[3px] border ${LEVEL_STYLE[level]} ${className}`} />;
}

export function LevelLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {LEVELS.map((l) => <li key={l.id} className="flex items-center gap-1.5"><LevelBox level={l.id} className="size-3" />{l.label}</li>)}
    </ul>
  );
}

export function PointsBar({ earned, max }: { earned: number; max: number }) {
  const pct = max ? Math.round((100 * earned) / max) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm"><span>{pct}% mastered</span><span className="tabular-nums text-muted-foreground">{earned} / {max} mastery points</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/** Starts a course quiz, unit test or challenge as an untimed custom test (results land in the usual results page). */
export function CourseCheckForm({ title, skillIds, count, label, variant = "outline" }: {
  title: string; skillIds: string[]; count: number; label: string; variant?: "default" | "outline";
}) {
  return (
    <form action={startTestAction}>
      <input type="hidden" name="kind" value="custom" />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="count" value={count} />
      <input type="hidden" name="difficulty" value="mixed" />
      {skillIds.map((id) => <input key={id} type="hidden" name="skillIds" value={id} />)}
      <Button type="submit" size="sm" variant={variant}>{label}</Button>
    </form>
  );
}
