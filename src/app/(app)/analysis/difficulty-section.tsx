"use client";

import { useState } from "react";
import { DifficultyRing, type Segment } from "./difficulty-rings";

export type SubjectRingData = {
  key: "math" | "rw";
  label: string;
  accuracy: [Segment, Segment, Segment];
  accuracyCenter: string;
  time: [Segment, Segment, Segment];
  timeCenter: string;
  share: [Segment, Segment, Segment];
  shareCenter: string;
  totalCorrect: number;
};

export function DifficultySection({ subjectRings }: { subjectRings: SubjectRingData[] }) {
  const [filter, setFilter] = useState<"both" | "math" | "rw">("both");

  const visibleRings = subjectRings.filter((subj) => filter === "both" || subj.key === filter);

  return (
    <section aria-labelledby="difficulty" className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 id="difficulty" className="font-semibold text-lg">By SAT difficulty</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each ring is split into Easy (lightest), Medium, and Hard (darkest).
          </p>
        </div>

        {/* Segmented slider control */}
        <div
          role="radiogroup"
          aria-label="Filter difficulty analytics by subject"
          className="inline-flex self-start sm:self-auto rounded-md border border-border/80 bg-muted/40 p-1 text-xs font-medium text-muted-foreground shadow-2xs"
        >
          <button
            type="button"
            role="radio"
            aria-checked={filter === "math"}
            onClick={() => setFilter("math")}
            className={`rounded-md px-3.5 py-1.5 transition-all ${
              filter === "math"
                ? "bg-background text-foreground font-semibold shadow-xs"
                : "hover:text-foreground"
            }`}
          >
            Math
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={filter === "rw"}
            onClick={() => setFilter("rw")}
            className={`rounded-md px-3.5 py-1.5 transition-all ${
              filter === "rw"
                ? "bg-background text-foreground font-semibold shadow-xs"
                : "hover:text-foreground"
            }`}
          >
            English
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={filter === "both"}
            onClick={() => setFilter("both")}
            className={`rounded-md px-3.5 py-1.5 transition-all ${
              filter === "both"
                ? "bg-background text-foreground font-semibold shadow-xs"
                : "hover:text-foreground"
            }`}
          >
            Both (Vertical)
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {visibleRings.map((subj) => (
          <div key={subj.key} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-border/40 pb-1.5">
              <span className="font-semibold text-sm text-foreground">{subj.label}</span>
              <span className="text-xs text-muted-foreground">Difficulty breakdown</span>
            </div>
            <div className="grid auto-rows-fr gap-3 md:grid-cols-3">
              <DifficultyRing
                title="Accuracy by difficulty"
                segments={subj.accuracy}
                centerValue={subj.accuracyCenter}
                centerLabel="accuracy"
              />
              <DifficultyRing
                title="Time per question"
                segments={subj.time}
                centerValue={subj.timeCenter}
                centerLabel="average"
              />
              <DifficultyRing
                title="Answers by difficulty"
                segments={subj.share}
                centerValue={subj.shareCenter}
                centerLabel="answers"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
