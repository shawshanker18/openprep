import type { SelfRating } from "@/engine/prior";

const SELF_PCT = [10, 35, 65, 85];

/** Single-hue mastery bar with an optional "you said" tick (spec 04 §1: no red/green traffic lights). */
export function MasteryBar({ pct, measured, selfRating }: { pct: number; measured: boolean; selfRating?: SelfRating | null }) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-md bg-muted" role="img"
      aria-label={measured ? `Mastery ${pct}%` : "Not measured yet"}>
      {measured && <div className="h-full rounded-md bg-primary" style={{ width: `${pct}%` }} />}
      {selfRating != null && (
        <div className="absolute top-0 h-full w-0.5 bg-foreground/60" style={{ left: `${SELF_PCT[selfRating]}%` }} title="What you said" />
      )}
    </div>
  );
}
