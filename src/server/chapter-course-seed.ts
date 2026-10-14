// Creates the chapter courses' starting data: for each course a published default version (its fallback), a covered
// version holding the covered-route lessons from content/chapter-courses/covered, and a draft rule that sends students
// who finished the chapter to the covered version. Nothing is published until an admin does it (publishVersion), and
// nothing an admin has edited is overwritten: every insert skips rows that already exist. Used by the seed script.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { and, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";
import { CHAPTER_COURSES, coveredVersionId, defaultVersionId } from "../content/chapter-courses";

const { courseVersionLessons, courseVersions, assignmentRules } = schema;
type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export const COVERED_PRIORITY = 10;
export const ruleName = (courseTitle: string) => `${courseTitle}: covered at school`;

export async function seedChapterCourses(db: Db, root = process.cwd()) {
  const added = { versions: 0, lessons: 0, rules: 0, missingLessons: [] as string[] };
  for (const course of CHAPTER_COURSES) {
    const covered = coveredVersionId(course.id);
    added.versions += (await db.insert(courseVersions).values([
      { id: defaultVersionId(course.id), courseId: course.id, name: `${course.title}: from the basics`, status: "published", isFallback: true,
        description: `For students who have not covered ${course.title} at school. Teaches the built-in lessons unless an admin customises them.` },
      { id: covered, courseId: course.id, name: `${course.title}: covered at school`, status: "draft",
        description: `For students who have finished ${course.title} at school. Skips the theory and teaches the SAT applications.` },
    ]).onConflictDoNothing().returning({ id: courseVersions.id })).length;

    for (const skillId of course.skills) {
      const file = path.join(root, "content", "chapter-courses", "covered", `${skillId}.md`);
      if (!fs.existsSync(file)) { added.missingLessons.push(skillId); continue; }
      const { data, content } = matter(fs.readFileSync(file, "utf8"));
      added.lessons += (await db.insert(courseVersionLessons).values({ versionId: covered, skillId, body: content.trim(), minutes: Number(data.minutes) || null })
        .onConflictDoNothing().returning({ id: courseVersionLessons.skillId })).length;
    }

    const name = ruleName(course.title);
    const [existing] = await db.select({ id: assignmentRules.id }).from(assignmentRules).where(and(eq(assignmentRules.name, name), eq(assignmentRules.targetVersionId, covered)));
    if (!existing) {
      await db.insert(assignmentRules).values({
        name, status: "draft", priority: COVERED_PRIORITY, targetVersionId: covered, condition: { all: [{ chapter: course.chapterId }] },
        description: `Students who marked ${course.title} as done at school get the covered route.`,
      });
      added.rules++;
    }
  }
  return added;
}
