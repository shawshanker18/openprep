// Making a chapter course: the course itself, the skills whose lessons it owns, a published default version (its
// fallback), a covered version in draft, and a draft rule that sends students who finished the chapter to it.
// Shared by the admin "new course" form and the seed script. Every insert skips what already exists, so running it
// again never overwrites an admin's edits. No "server-only" import: the seed script runs it outside Next.
import { and, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";
import { coveredVersionId, defaultVersionId } from "../content/chapter-courses";

const { assignmentRules, courseSkills, courses, courseVersions } = schema;
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export const COVERED_PRIORITY = 10;
export const ruleName = (courseTitle: string) => `${courseTitle}: covered at school`;

export type CourseSpec = { id: string; title: string; chapterId: string | null; skills: string[] };

export async function ensureCourse(db: Db, spec: CourseSpec) {
  const added = { course: false, versions: 0, skills: 0, rule: false };
  added.course = (await db.insert(courses).values({ id: spec.id, title: spec.title, chapterId: spec.chapterId }).onConflictDoNothing().returning({ id: courses.id })).length > 0;
  for (const skillId of spec.skills)
    added.skills += (await db.insert(courseSkills).values({ skillId, courseId: spec.id }).onConflictDoNothing().returning({ id: courseSkills.skillId })).length;

  const covered = coveredVersionId(spec.id);
  added.versions += (await db.insert(courseVersions).values([
    { id: defaultVersionId(spec.id), courseId: spec.id, name: `${spec.title}: from the basics`, status: "published", isFallback: true,
      description: `For students who have not covered ${spec.title} at school. Teaches the built-in lessons unless an admin customises them.` },
    { id: covered, courseId: spec.id, name: `${spec.title}: covered at school`, status: "draft",
      description: `For students who have finished ${spec.title} at school. Skips the theory and teaches the SAT applications.` },
  ]).onConflictDoNothing().returning({ id: courseVersions.id })).length;

  if (spec.chapterId) {
    const name = ruleName(spec.title);
    const [existing] = await db.select({ id: assignmentRules.id }).from(assignmentRules).where(and(eq(assignmentRules.name, name), eq(assignmentRules.targetVersionId, covered)));
    if (!existing) {
      await db.insert(assignmentRules).values({
        name, status: "draft", priority: COVERED_PRIORITY, targetVersionId: covered, condition: { all: [{ chapter: spec.chapterId }] },
        description: `Students who marked ${spec.title} as done at school get the covered route.`,
      });
      added.rule = true;
    }
  }
  return added;
}
