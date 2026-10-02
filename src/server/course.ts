// Read side of the SAT course: each skill's course level for one student.
import "server-only";
import { levelOf, type Level } from "@/engine/course";
import { getSkillSummary } from "./analytics";

export async function getCourseLevels(userId: string): Promise<Record<string, { level: Level; mastery: number; n: number }>> {
  const { skills } = await getSkillSummary(userId);
  return Object.fromEntries(skills.map((s) => [s.id, { level: levelOf(s.n, s.status), mastery: s.mastery, n: s.n }]));
}
