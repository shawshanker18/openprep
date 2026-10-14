// The lesson a student reads for a skill that belongs to a chapter course: the text saved for the version they are on,
// or null when there is none (the caller then shows the built-in lesson file). Only published versions are used.
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { courseVersionLessons, courseVersions, studentCourseAssignments } from "@/db/schema";
import { COURSE_OF_SKILL } from "@/content/chapter-courses";
import { lessonFromBody, type Lesson } from "./lessons";

export async function getStudentLesson(userId: string, skillId: string): Promise<(Lesson & { versionId: string; versionName: string }) | null> {
  const course = COURSE_OF_SKILL.get(skillId);
  if (!course) return null;
  const [row] = await db.select({ body: courseVersionLessons.body, minutes: courseVersionLessons.minutes, versionId: courseVersions.id, versionName: courseVersions.name })
    .from(studentCourseAssignments)
    .innerJoin(courseVersions, and(eq(courseVersions.id, studentCourseAssignments.versionId), eq(courseVersions.status, "published")))
    .innerJoin(courseVersionLessons, and(eq(courseVersionLessons.versionId, courseVersions.id), eq(courseVersionLessons.skillId, skillId)))
    .where(and(eq(studentCourseAssignments.userId, userId), eq(studentCourseAssignments.courseId, course.id)));
  if (!row) return null;
  return { ...lessonFromBody(row.body, row.minutes), versionId: row.versionId, versionName: row.versionName };
}
