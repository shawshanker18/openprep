"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { canRemixQuestion, canSwapNumbers, DIRECTIONS, DIRECTION_BADGE, DIRECTION_LABEL, type Direction } from "@/lib/remix";
import type { Tier } from "@/lib/tiers";
import { remixOriginOf, remixQuestion } from "./actions";

/** Easier / same / harder AI remix of the question just answered. Free students see what it is and where to get it. */
export function RemixBar({ questionId, tier, question }: { questionId: string; tier: Tier; question: Parameters<typeof canSwapNumbers>[0] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  if (!canRemixQuestion(question)) return null;
  if (tier === "free") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3 text-sm">
        <span className="text-muted-foreground">Want this question easier, the same, harder or with new numbers? AI remixes are part of Plus and Pro.</span>
        <Button variant="outline" size="sm" render={<Link href="/pricing" />}>See plans</Button>
      </div>
    );
  }
  const go = (direction: Direction) => {
    setBusy(direction);
    start(async () => {
      const res = await remixQuestion({ questionId, direction }).catch(() => ({ ok: false as const, error: "Couldn't remix. Check your connection and try again." }));
      if (res.ok) router.push(res.data.url); else { toast.error(res.error); setBusy(null); }
    });
  };
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <p className="text-sm font-medium">Remix this question with AI</p>
      <div className="flex flex-wrap gap-2">
        {DIRECTIONS.filter((d) => d !== "numbers" || canSwapNumbers(question)).map((d) => (
          <Button key={d} variant="outline" size="sm" disabled={pending} onClick={() => go(d)}>{busy === d ? "Remixing…" : DIRECTION_LABEL[d]}</Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">AI-generated, not an official question. Remixes someone already made open instantly.</p>
    </div>
  );
}

/** "Harder remix of question 4f2a", shown above a remixed question. */
export function RemixBadge({ questionId }: { questionId: string }) {
  const [origin, setOrigin] = useState<{ direction: string; sourceRef: string } | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    remixOriginOf({ questionId }).then((o) => live && setOrigin(o)).catch(() => live && setOrigin(null));
    return () => { live = false; };
  }, [questionId]);
  return (
    <p className="text-sm">
      <span className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
        {origin ? `${DIRECTION_BADGE[origin.direction as Direction] ?? "AI"} remix of question ${origin.sourceRef}` : "AI remix"}
      </span>
      <span className="ml-2 text-muted-foreground">AI-generated, not official</span>
    </p>
  );
}
