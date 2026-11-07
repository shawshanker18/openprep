"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { canRemixQuestion, canSwapNumbers, DIRECTIONS, DIRECTION_BADGE, DIRECTION_LABEL, type Direction } from "@/lib/remix";
import type { Tier } from "@/lib/tiers";
import { remixOriginOf, remixQuestion } from "./actions";

/** Remix button beside the question counter: hover or tap for easier / same / harder. Free students see where to get it. */
export function RemixMenu({ questionId, tier, question, from }: { questionId: string; tier: Tier; question: Parameters<typeof canSwapNumbers>[0]; from: { sessionId: string; position: number } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  if (!canRemixQuestion(question)) return null;
  const go = (direction: Direction) => start(async () => {
    const res = await remixQuestion({ questionId, direction, from }).catch(() => ({ ok: false as const, error: "Couldn't remix. Check your connection and try again." }));
    if (res.ok) router.push(res.data.url); else toast.error(res.error);
  });
  const onEnter = (e: React.PointerEvent) => { if (e.pointerType === "mouse") { hovering.current = true; setOpen(true); } };
  const onLeave = (e: React.PointerEvent) => { if (e.pointerType === "mouse") { hovering.current = false; setOpen(false); } };
  // A mouse has already opened the menu by hovering, so its click must not close it again.
  const onClick = () => { if (hovering.current) setOpen(true); else setOpen((v) => !v); };
  return (
    <div ref={box} className="relative" onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <button type="button" aria-expanded={open} aria-haspopup="menu" disabled={pending} onClick={onClick}
        className="flex min-h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-semibold disabled:opacity-60">
        <Sparkles className="size-4" />{pending ? "Remixing…" : "Remix"}
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 z-20 w-56 -translate-x-1/2 pb-2">
          <div role="menu" className="flex flex-col gap-1 rounded-lg border bg-background p-2 shadow-xl">
            {tier === "free" ? (
              <>
                <p className="p-1 text-xs text-muted-foreground">Make this question easier, the same, harder or with new numbers. AI remixes are part of Plus and Pro.</p>
                <Button variant="outline" size="sm" render={<Link href="/pricing" />}>See plans</Button>
              </>
            ) : (
              <>
                {DIRECTIONS.filter((d) => d !== "numbers" || canSwapNumbers(question)).map((d) => (
                  <button key={d} type="button" role="menuitem" disabled={pending} onClick={() => go(d)} className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-60">{DIRECTION_LABEL[d]}</button>
                ))}
                <p className="px-2 pt-1 text-xs text-muted-foreground">AI-generated, not an official question.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** "Harder", shown above a remixed question. */
export function RemixBadge({ questionId }: { questionId: string }) {
  const [origin, setOrigin] = useState<{ direction: string } | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    remixOriginOf({ questionId }).then((o) => live && setOrigin(o)).catch(() => live && setOrigin(null));
    return () => { live = false; };
  }, [questionId]);
  return (
    <p className="text-sm">
      <span className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
        {origin ? DIRECTION_BADGE[origin.direction as Direction] ?? "AI remix" : "AI remix"}
      </span>
      <span className="ml-2 text-muted-foreground">AI-generated, not official</span>
    </p>
  );
}
