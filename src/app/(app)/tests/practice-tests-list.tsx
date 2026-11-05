"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScopeButton } from "@/components/scope-button";
import { ModuleMenu } from "@/components/module-menu";
import { startTestAction } from "./actions";

export type TestCardData = {
  paper: number;
  defaultDifficulty: "easy" | "medium" | "hard" | "mixed";
  lastFull?: {
    total?: number | null;
    math?: number | null;
    rw?: number | null;
  };
  lastModules: Record<string, string>;
  openHere: boolean;
  openFullId?: string;
  finishedCount: number;
};

const DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  medium: {
    label: "Medium",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  hard: {
    label: "Hard",
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  mixed: {
    label: "SAT-like",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
    dot: "bg-sky-500",
  },
} as const;

type FilterOption = "all" | "easy" | "medium" | "hard" | "mixed";

export function PracticeTestsList({ tests }: { tests: TestCardData[] }) {
  const [filter, setFilter] = useState<FilterOption>("all");
  const [cardDifficulties, setCardDifficulties] = useState<Record<number, "easy" | "medium" | "hard" | "mixed">>(() => {
    const init: Record<number, "easy" | "medium" | "hard" | "mixed"> = {};
    for (const t of tests) {
      init[t.paper] = t.defaultDifficulty;
    }
    return init;
  });

  const filterTabs: { id: FilterOption; label: string }[] = [
    { id: "all", label: "All tests" },
    { id: "easy", label: "Easy" },
    { id: "medium", label: "Medium" },
    { id: "hard", label: "Hard" },
    { id: "mixed", label: "SAT-like" },
  ];

  const visibleTests = tests.filter((t) => {
    if (filter === "all") return true;
    const currentDiff = cardDifficulties[t.paper] ?? t.defaultDifficulty;
    return currentDiff === filter || t.defaultDifficulty === filter;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Difficulty selector tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 p-1 text-xs">
          <span className="px-2 font-medium text-muted-foreground">Difficulty:</span>
          {filterTabs.map((tab) => {
            const count = tab.id === "all" ? tests.length : tests.filter((t) => (cardDifficulties[t.paper] ?? t.defaultDifficulty) === tab.id).length;
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
                  active
                    ? "bg-background text-foreground shadow-xs ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className="text-[10px] opacity-60 tabular-nums">({count})</span>
              </button>
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground">
          Showing {visibleTests.length} of {tests.length} practice tests
        </span>
      </div>

      {/* Tests Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {visibleTests.map((t) => {
          const selectedDiff = cardDifficulties[t.paper] ?? t.defaultDifficulty;
          const diffCfg = DIFFICULTY_CONFIG[selectedDiff];

          return (
            <form
              key={t.paper}
              action={startTestAction}
              className="flex min-w-0 flex-col justify-between gap-4 rounded-xl border border-border/80 bg-card p-5 transition-colors hover:border-foreground/20 shadow-xs"
            >
              <input type="hidden" name="paper" value={t.paper} />
              <input type="hidden" name="difficulty" value={selectedDiff} />

              <div className="flex flex-col gap-3">
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-semibold tracking-tight">Practice Test {t.paper}</h3>
                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${diffCfg.badge}`}>
                      <span className={`size-1.5 rounded-xs ${diffCfg.dot}`} />
                      {diffCfg.label}
                    </span>
                  </div>

                  {/* Status badge: only show if in progress or finished, NO 'Not started' badge */}
                  {t.openHere ? (
                    <span className="rounded-md border border-primary/50 bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground">
                      In progress
                    </span>
                  ) : t.finishedCount > 0 ? (
                    <span className="rounded-md border border-emerald-600/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {t.finishedCount} completed
                    </span>
                  ) : null}
                </header>

                {/* Difficulty selector options on card */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Mode:</span>
                  <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
                    {(["easy", "medium", "hard", "mixed"] as const).map((diffKey) => {
                      const isSelected = selectedDiff === diffKey;
                      const cfg = DIFFICULTY_CONFIG[diffKey];
                      return (
                        <button
                          key={diffKey}
                          type="button"
                          onClick={() => setCardDifficulties((prev) => ({ ...prev, [t.paper]: diffKey }))}
                          className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                            isSelected
                              ? "bg-background text-foreground shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Score Stats Row (sleek, not chunky boxes) */}
                <dl className="grid grid-cols-3 gap-2 rounded-lg border border-border/50 bg-muted/20 p-2.5 text-center">
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Last total</dt>
                    <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                      {t.lastFull?.total ? `≈ ${t.lastFull.total}` : "—"}
                    </dd>
                  </div>
                  <div className="border-x border-border/50">
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Last Math</dt>
                    <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                      {t.lastFull?.math ? `≈ ${t.lastFull.math}` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Last R&W</dt>
                    <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                      {t.lastFull?.rw ? `≈ ${t.lastFull.rw}` : "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                {t.openFullId ? (
                  <Button size="lg" render={<Link href={`/test/${t.openFullId}`} />}>
                    Resume full test
                  </Button>
                ) : (
                  <ScopeButton value="full" variant="default" size="lg" className="w-full">
                    Start full test ({diffCfg.label})
                  </ScopeButton>
                )}

                <ModuleMenu paper={t.paper} last={t.lastModules} />
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
}
