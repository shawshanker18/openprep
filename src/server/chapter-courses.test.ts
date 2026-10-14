// Chapter courses end to end on real Postgres (PGlite, all migrations applied): seeding, publishing, one version of
// every course per student, independence between chapters, and the lesson a student actually reads.
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema";

const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
vi.mock("@/server/admin", () => ({ audit: async () => {}, requireAdmin: async () => ({ adminId: ADMIN }) }));

const { evaluateStudent, studentAssignments } = await import("./course-assignment");
const { publishVersion, saveVersionLesson, resetVersionLesson, saveVersion } = await import("./assignment-admin");
const { getStudentLesson } = await import("./course-lessons");
const { seedChapterCourses } = await import("./chapter-course-seed");

const ADMIN = "00000000-0000-4000-8000-00000000ad01";
const LINES = "00000000-0000-4000-8000-00000000b001"; // finished Straight Lines only
const FUNCS = "00000000-0000-4000-8000-00000000b002"; // finished Relations and Functions only
const NONE = "00000000-0000-4000-8000-00000000b003"; // finished nothing
const BOTH = "00000000-0000-4000-8000-00000000b004"; // finished both
const routeOf = async (id: string, course: string) => (await studentAssignments(id)).find((a) => a.courseId === course)?.versionId;

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values([
    { id: LINES, chaptersDone: ["cbse-11-straight-lines"] },
    { id: FUNCS, chaptersDone: ["cbse-11-relations-functions"] },
    { id: NONE, chaptersDone: [] },
    { id: BOTH, chaptersDone: ["cbse-11-straight-lines", "cbse-11-relations-functions"] },
  ]);
}, 120_000);

describe("seeding", () => {
  it("migration 0024 already holds the five courses and their skills, matching the starting data", async () => {
    const { CHAPTER_COURSES } = await import("@/content/chapter-courses");
    const rows = await db.select().from(schema.courses);
    expect(rows.map((c) => [c.id, c.title, c.chapterId]).sort()).toEqual(CHAPTER_COURSES.map((c) => [c.id, c.title, c.chapterId]).sort());
    const skills = await db.select().from(schema.courseSkills);
    expect(skills.map((r) => `${r.courseId}:${r.skillId}`).sort()).toEqual(CHAPTER_COURSES.flatMap((c) => c.skills.map((s) => `${c.id}:${s}`)).sort());
  });

  it("creates a default and a covered version, the covered lessons and a draft rule for each of the five courses", async () => {
    const added = await seedChapterCourses(db as never);
    expect(added).toMatchObject({ courses: 0, versions: 10, lessons: 8, rules: 5, missingLessons: [] }); // migration 0024 already created the courses
    const versions = await db.select().from(schema.courseVersions);
    expect(versions.filter((v) => v.isFallback).map((v) => v.id).sort()).toEqual([
      "conic-sections-default", "relations-functions-default", "statistics-default", "straight-lines-default", "trig-functions-default",
    ]);
    expect(versions.filter((v) => v.id.endsWith("-covered")).every((v) => v.status === "draft")).toBe(true);
    expect((await db.select().from(schema.assignmentRules)).every((r) => r.status === "draft")).toBe(true);
  });

  it("is repeatable and never overwrites an edited lesson", async () => {
    await db.update(schema.courseVersionLessons).set({ body: "## Edited\n\nMine." }).where(eq(schema.courseVersionLessons.skillId, "m-alg-lin2"));
    expect(await seedChapterCourses(db as never)).toMatchObject({ versions: 0, lessons: 0, rules: 0 });
    const [row] = await db.select().from(schema.courseVersionLessons).where(eq(schema.courseVersionLessons.skillId, "m-alg-lin2"));
    expect(row!.body).toBe("## Edited\n\nMine.");
    await db.delete(schema.courseVersionLessons).where(eq(schema.courseVersionLessons.skillId, "m-alg-lin2"));
    expect(await seedChapterCourses(db as never)).toMatchObject({ lessons: 1 });
  });
});

describe("before anything is published", () => {
  it("every student is on the default version of every course", async () => {
    for (const id of [LINES, FUNCS, NONE, BOTH]) await evaluateStudent(id);
    for (const id of [LINES, FUNCS, NONE, BOTH]) {
      expect(await routeOf(id, "straight-lines")).toBe("straight-lines-default");
      expect(await routeOf(id, "relations-functions")).toBe("relations-functions-default");
    }
  });

  it("a student reads the built-in lesson (no version text) for a skill", async () => {
    expect(await getStudentLesson(LINES, "m-alg-lin2")).toBeNull();
  });
});

describe("publishing a covered route", () => {
  it("takes the version and its draft rule live and moves only the students who finished that chapter", async () => {
    const r = await publishVersion(ADMIN, "straight-lines-covered");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.rules).toBe(1);
    expect(await routeOf(LINES, "straight-lines")).toBe("straight-lines-covered");
    expect(await routeOf(BOTH, "straight-lines")).toBe("straight-lines-covered");
    expect(await routeOf(FUNCS, "straight-lines")).toBe("straight-lines-default");
    expect(await routeOf(NONE, "straight-lines")).toBe("straight-lines-default");
  });

  it("finishing one chapter never changes another chapter's route", async () => {
    expect(await routeOf(LINES, "relations-functions")).toBe("relations-functions-default");
    await publishVersion(ADMIN, "relations-functions-covered");
    expect(await routeOf(LINES, "relations-functions")).toBe("relations-functions-default");
    expect(await routeOf(FUNCS, "relations-functions")).toBe("relations-functions-covered");
    expect(await routeOf(FUNCS, "straight-lines")).toBe("straight-lines-default");
    expect(await routeOf(BOTH, "straight-lines")).toBe("straight-lines-covered");
    expect(await routeOf(BOTH, "relations-functions")).toBe("relations-functions-covered");
  });

  it("publishing is stored as one history row per course change, tagged with its course", async () => {
    const rows = await db.select().from(schema.assignmentHistory).where(and(eq(schema.assignmentHistory.userId, BOTH), eq(schema.assignmentHistory.courseId, "straight-lines")));
    expect(rows.map((h) => h.versionId)).toEqual(expect.arrayContaining(["straight-lines-default", "straight-lines-covered"]));
  });

  it("a student who later marks the chapter done moves to the covered route, and back if they untick it", async () => {
    await db.update(schema.profiles).set({ chaptersDone: ["cbse-11-straight-lines"] }).where(eq(schema.profiles.id, NONE));
    await evaluateStudent(NONE);
    expect(await routeOf(NONE, "straight-lines")).toBe("straight-lines-covered");
    await db.update(schema.profiles).set({ chaptersDone: [] }).where(eq(schema.profiles.id, NONE));
    await evaluateStudent(NONE);
    expect(await routeOf(NONE, "straight-lines")).toBe("straight-lines-default");
  });
});

describe("the lesson a student reads", () => {
  it("is the covered-route text for a student on the covered version", async () => {
    const lesson = await getStudentLesson(LINES, "m-alg-lin2");
    expect(lesson?.versionId).toBe("straight-lines-covered");
    expect(lesson?.sections.map((s) => s.heading)).toContain("What the SAT adds");
  });

  it("falls back to the built-in lesson for a student on the default version, and for skills outside every course", async () => {
    expect(await getStudentLesson(FUNCS, "m-alg-lin2")).toBeNull();
    expect(await getStudentLesson(LINES, "m-alg-lin1")).toBeNull();
  });

  it("does not show the fast-way section, same as the built-in lessons", async () => {
    await saveVersionLesson(ADMIN, { versionId: "straight-lines-covered", skillId: "m-alg-lin2", body: "## Idea\n\nOne.\n\n## The fast way (and when to use Desmos)\n\nHidden." });
    const lesson = await getStudentLesson(LINES, "m-alg-lin2");
    expect(lesson?.sections.map((s) => s.heading)).toEqual(["Idea"]);
  });
});

describe("editing a version's lessons", () => {
  const save = (over: Record<string, unknown> = {}) => saveVersionLesson(ADMIN, { versionId: "straight-lines-default", skillId: "m-alg-linfunc", body: "## Basics\n\nStart from zero.", minutes: "9", ...over });

  it("saves a default version's lesson and students on it read the edit at once", async () => {
    expect((await save()).ok).toBe(true);
    const lesson = await getStudentLesson(NONE, "m-alg-linfunc");
    expect(lesson).toMatchObject({ versionId: "straight-lines-default", minutes: 9 });
    expect(lesson?.sections[0]).toMatchObject({ heading: "Basics", md: "Start from zero." });
  });

  it("strips pasted frontmatter", async () => {
    await save({ body: "---\nskill: m-alg-linfunc\nminutes: 5\n---\n## Basics\n\nClean." });
    const [row] = await db.select().from(schema.courseVersionLessons).where(and(eq(schema.courseVersionLessons.versionId, "straight-lines-default"), eq(schema.courseVersionLessons.skillId, "m-alg-linfunc")));
    expect(row!.body).toBe("## Basics\n\nClean.");
  });

  it("rejects a skill the course does not own, an unknown version, text without sections, and oversized text", async () => {
    expect((await save({ skillId: "m-psda-onevar" })).ok).toBe(false);
    expect((await save({ versionId: "nope" })).ok).toBe(false);
    expect((await save({ body: "no headings here" })).ok).toBe(false);
    expect((await save({ body: "## A\n" + "x".repeat(40_001) })).ok).toBe(false);
  });

  it("resetting goes back to the built-in lesson", async () => {
    const r = await resetVersionLesson(ADMIN, "straight-lines-default", "m-alg-linfunc");
    expect(r).toMatchObject({ ok: true, value: { removed: true } });
    expect(await getStudentLesson(NONE, "m-alg-linfunc")).toBeNull();
  });

  it("ignores text saved on a version that is not published", async () => {
    await saveVersion(ADMIN, { id: "straight-lines-covered", courseId: "straight-lines", name: "Straight Lines: covered at school", status: "retired", isFallback: false });
    expect(await getStudentLesson(LINES, "m-alg-lin2")).toBeNull();
  });
});

describe("fallbacks are per course", () => {
  it("another course keeps its own fallback when one course changes its fallback", async () => {
    await saveVersion(ADMIN, { id: "straight-lines-default", courseId: "straight-lines", name: "Straight Lines: from the basics", status: "published", isFallback: "on" });
    const flagged = await db.select({ id: schema.courseVersions.id }).from(schema.courseVersions).where(eq(schema.courseVersions.isFallback, true));
    expect(flagged.length).toBe(5);
  });
});
