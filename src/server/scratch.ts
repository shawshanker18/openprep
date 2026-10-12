// Start from scratch: one path through everything on the SAT, in teaching order, for a student who knows nothing yet.
// Progress lives in lesson_progress: a finished step stores its lesson key (the skill id, "desmos:<slug>", or
// "scratch:about-the-sat"), so finishing a lesson here or on its own page counts in both places. A skipped step
// stores "skip:<step key>", which finishing the step later removes.
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessonProgress } from "@/db/schema";
import { DOMAINS, skillsIn, type DomainId } from "@/content/taxonomy";
import { ORIENTATION } from "@/content/getting-started";
import { listDesmosLessons } from "./lessons";

export type ScratchStep = {
  key: string; // URL segment under /start
  done: string; // lesson_progress key written when the step is finished
  kind: "intro" | "desmos" | "skill";
  title: string;
  group: string;
  ref: string; // skill id or Desmos lesson slug ("" for the intro)
};

const MATH: DomainId[] = ["m-alg", "m-adv", "m-psda", "m-geo"];
const RW: DomainId[] = ["rw-ii", "rw-cs", "rw-ei", "rw-sec"];
export const SKIP_PREFIX = "skip:";
export const GETTING_STARTED = "Getting started";

/** Every step in order: getting started, the Desmos basics, then every Math topic, then every Reading and Writing topic. */
export async function scratchPath(): Promise<ScratchStep[]> {
  const desmos = await listDesmosLessons();
  return [
    // Orientation lessons: their own group, not part of Maths or English.
    ...ORIENTATION.map((l): ScratchStep => ({ key: l.key, done: `scratch:${l.key}`, kind: "intro", title: l.title, group: GETTING_STARTED, ref: "" })),
    ...desmos.map((l): ScratchStep => ({ key: `desmos-${l.slug}`, done: `desmos:${l.slug}`, kind: "desmos", title: l.title, group: "Desmos basics", ref: l.slug })),
    ...[...MATH, ...RW].flatMap((d) => skillsIn(d).map((s): ScratchStep => ({
      key: s.id, done: s.id, kind: "skill", title: s.name, group: `${DOMAINS[d].section === "math" ? "Math" : "Reading and Writing"}: ${DOMAINS[d].name}`, ref: s.id,
    }))),
  ];
}

export async function scratchProgress(userId: string) {
  const [steps, rows] = await Promise.all([
    scratchPath(),
    db.select({ key: lessonProgress.skillId }).from(lessonProgress).where(eq(lessonProgress.userId, userId)),
  ]);
  const have = new Set(rows.map((r) => r.key));
  const status = (s: ScratchStep) => have.has(s.done) ? "done" as const : have.has(SKIP_PREFIX + s.key) ? "skipped" as const : "todo" as const;
  const withStatus = steps.map((s) => ({ ...s, status: status(s) }));
  return { steps: withStatus, next: withStatus.find((s) => s.status === "todo") ?? null };
}

/** The step to open after `key`: the next one not finished or skipped, or null at the end of the path. */
export function nextAfter(steps: { key: string; status: string }[], key: string) {
  const i = steps.findIndex((s) => s.key === key);
  return steps.slice(i + 1).find((s) => s.status === "todo") ?? null;
}

export async function setStep(userId: string, step: ScratchStep, action: "done" | "skip") {
  if (action === "done") {
    await db.insert(lessonProgress).values({ userId, skillId: step.done })
      .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.skillId], set: { completedAt: new Date() } });
    await db.delete(lessonProgress).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.skillId, SKIP_PREFIX + step.key)));
  } else {
    await db.insert(lessonProgress).values({ userId, skillId: SKIP_PREFIX + step.key }).onConflictDoNothing();
  }
}
