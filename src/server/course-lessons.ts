// The lesson a student reads for a skill that belongs to a course: the text saved for the version they are on, or null
// when there is none (the caller then shows the built-in lesson file). Only published versions are used, and only for
// the course that owns the skill.
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { courseSkills, courseVersionLessons, courseVersions, studentCourseAssignments } from "@/db/schema";
import { lessonFromBody, type Lesson } from "./lessons";

export async function getStudentLesson(userId: string, skillId: string): Promise<(Lesson & { versionId: string; versionName: string }) | null> {
  const [row] = await db.select({ body: courseVersionLessons.body, minutes: courseVersionLessons.minutes, versionId: courseVersions.id, versionName: courseVersions.name })
    .from(studentCourseAssignments)
    .innerJoin(courseSkills, and(eq(courseSkills.skillId, skillId), eq(courseSkills.courseId, studentCourseAssignments.courseId)))
    .innerJoin(courseVersions, and(eq(courseVersions.id, studentCourseAssignments.versionId), eq(courseVersions.status, "published")))
    .innerJoin(courseVersionLessons, and(eq(courseVersionLessons.versionId, courseVersions.id), eq(courseVersionLessons.skillId, skillId)))
    .where(eq(studentCourseAssignments.userId, userId));
  if (!row) return null;
  return { ...lessonFromBody(row.body, row.minutes), versionId: row.versionId, versionName: row.versionName };
}
