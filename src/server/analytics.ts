// Read-side numbers for the student model (spec 03 §11–12). Plain SQL over indexed columns.
import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, skillState } from "@/db/schema";
import { SKILLS, SKILL_BY_ID } from "@/content/taxonomy";
import { masteryPct, pace, status, type Status } from "@/engine/mastery";
import { calibration, type SelfRating } from "@/engine/prior";
import { sectionEstimate, totalEstimate } from "@/engine/score";

export async function getSkillSummary(userId: string) {
  const [states, byDomain] = await Promise.all([
    db.select().from(skillState).where(eq(skillState.userId, userId)),
    db.select({ skillId: attempts.skillId, n: sql<number>`count(*)::int` }).from(attempts)
      .where(eq(attempts.userId, userId)).groupBy(attempts.skillId),
  ]);
  const domainsWithEvidence = new Set(byDomain.map((r) => SKILL_BY_ID[r.skillId]?.domain));
  const skills = SKILLS.map((s) => {
    const st = states.find((x) => x.skillId === s.id);
    const theta = st?.theta ?? 0, n = st?.n ?? 0;
    const m = masteryPct(theta);
    return {
      ...s, theta, n, mastery: m,
      status: status(theta, domainsWithEvidence.has(s.domain)) as Status,
      selfRating: (st?.selfRating ?? null) as SelfRating | null,
      calibration: calibration((st?.selfRating ?? null) as SelfRating | null, m, n),
      accuracy: n ? Math.round((100 * (st?.nCorrect ?? 0)) / n) : null,
      avgMs: n ? Math.round((st?.totalTimeMs ?? 0) / n) : null,
      pace: n ? pace((st?.totalTimeMs ?? 0) / n, s.section) : null,
      lastPracticedAt: st?.lastPracticedAt ?? null,
    };
  });
  const rw = sectionEstimate(states, "rw"), math = sectionEstimate(states, "math");
  return { skills, estimate: { rw, math, total: totalEstimate(rw, math) } };
}

export type SkillSummary = Awaited<ReturnType<typeof getSkillSummary>>["skills"][number];
