// Creates the starting data for the five Class 11 chapter courses: each course through ensureCourse (course, skills,
// default and covered versions, draft rule), plus the covered-route lessons from content/chapter-courses/covered.
// Nothing is published until an admin does it (publishVersion), and nothing an admin has edited is overwritten.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import * as schema from "../db/schema";
import { CHAPTER_COURSES, coveredVersionId } from "../content/chapter-courses";
import { ensureCourse, type Db } from "./course-builder";

export { COVERED_PRIORITY, ruleName } from "./course-builder";

export async function seedChapterCourses(db: Db, root = process.cwd()) {
  const added = { courses: 0, versions: 0, lessons: 0, rules: 0, missingLessons: [] as string[] };
  for (const course of CHAPTER_COURSES) {
    const r = await ensureCourse(db, { id: course.id, title: course.title, chapterId: course.chapterId, skills: course.skills });
    added.courses += r.course ? 1 : 0; added.versions += r.versions; added.rules += r.rule ? 1 : 0;
    for (const skillId of course.skills) {
      const file = path.join(root, "content", "chapter-courses", "covered", `${skillId}.md`);
      if (!fs.existsSync(file)) { added.missingLessons.push(skillId); continue; }
      const { data, content } = matter(fs.readFileSync(file, "utf8"));
      added.lessons += (await db.insert(schema.courseVersionLessons).values({ versionId: coveredVersionId(course.id), skillId, body: content.trim(), minutes: Number(data.minutes) || null })
        .onConflictDoNothing().returning({ id: schema.courseVersionLessons.skillId })).length;
    }
  }
  return added;
}
