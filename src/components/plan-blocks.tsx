import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SKILL_BY_ID } from "@/content/taxonomy";
import type { PlanBlock } from "@/engine/plan";
import type { PlanBlockStatus } from "@/server/daily";
import { cn } from "@/lib/utils";
import { removePlanBlock } from "@/app/(app)/plan/actions";

function describe(b: PlanBlock, i: number): { label: string; href: string } {
  switch (b.kind) {
    case "review": return { label: "Review mistakes", href: `/practice?mode=review&block=${i}` };
    case "learn": return { label: `Learn ${SKILL_BY_ID[b.skillId]?.name}`, href: `/start/${b.skillId}` };
    case "practice": return { label: `Practise ${SKILL_BY_ID[b.skillId]?.name}`, href: `/practice?skill=${b.skillId}&block=${i}` };
    case "mini": return { label: `Check-in: ${SKILL_BY_ID[b.skillId]?.name}`, href: `/practice?skill=${b.skillId}&block=${i}` };
    case "desmos": return { label: "Desmos skills", href: `/desmos/${b.lessonSlug}?block=${i}` };
  }
}

export function PlanBlocks({ blocks, removable }: { blocks: PlanBlockStatus[]; removable?: boolean }) {
  if (!blocks.length) return <p className="text-sm text-muted-foreground">Nothing planned today. Try smart practice.</p>;
  return (
    <ol className="flex flex-col gap-2">
      {blocks.map((b, i) => {
        const { label, href } = describe(b, i);
        return (
          <li key={i} className={cn("flex items-center gap-3 rounded-lg border p-3", b.done && "opacity-60")}>
            {/* Done is worked out from real answers and lessons, so this is a status, not a button. */}
            <span role="img" aria-label={b.done ? "Done" : "Not done yet"}
              className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border", b.done && "bg-primary text-primary-foreground")}>
              {b.done && <Check className="size-4" />}
            </span>
            <div className="flex-1 text-sm">
              <span className={cn(b.done && "line-through")}>{label}</span>
              <span className="ml-2 text-muted-foreground tabular-nums">
                {b.minutes} min{b.progress && !b.done ? ` · ${b.progress.n} of ${b.progress.target} questions` : ""}
              </span>
            </div>
            {!b.done && <Button size="sm" variant="outline" render={<Link href={href} />}>Start</Button>}
            {removable && (
              <form action={removePlanBlock.bind(null, i)}>
                <Button size="sm" variant="ghost" type="submit" aria-label={`Remove "${label}"`}>Remove</Button>
              </form>
            )}
          </li>
        );
      })}
    </ol>
  );
}
