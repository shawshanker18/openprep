"use client";

import { useState } from "react";
import { LessonStudyView } from "@/components/lesson-study-view";

type Section = { heading: string; md: string };
type Level = { minutes: number | null; sections: Section[] };

/** Foundation and Mastery for one skill. Mastery is shown only when it has been written. */
export function LessonLevels({ skillId, foundation, mastery }: { skillId: string; foundation: Level; mastery: Level | null }) {
  const [level, setLevel] = useState<"foundation" | "mastery">("foundation");
  const current = level === "mastery" && mastery ? mastery : foundation;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {mastery && (
        <div role="group" aria-label="Lesson level" className="flex w-fit gap-1 rounded-lg border p-1">
          {(["foundation", "mastery"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)}
              className={`min-h-9 rounded-md px-3 text-sm capitalize ${level === l ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>
      )}
      {current.minutes && <p className="text-sm text-muted-foreground">About {current.minutes} minutes · {level === "mastery" && mastery ? "Mastery" : "Foundation"}</p>}
      <LessonStudyView sections={current.sections} skillId={skillId} curriculum={null} grade={null} subjects={[]} />
    </div>
  );
}
