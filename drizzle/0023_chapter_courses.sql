CREATE TABLE "course_version_lessons" (
	"version_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"body" text NOT NULL,
	"minutes" smallint,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_version_lessons_version_id_skill_id_pk" PRIMARY KEY("version_id","skill_id"),
	CONSTRAINT "course_version_lessons_body_check" CHECK (length("course_version_lessons"."body") between 1 and 40000)
);
--> statement-breakpoint
ALTER TABLE "course_version_lessons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "course_version_lessons" ADD CONSTRAINT "course_version_lessons_version_id_course_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."course_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Assignments are now per course (one row per student per chapter course). Existing rows belong to the course of their version.
ALTER TABLE "student_course_assignments" ADD COLUMN "course_id" text;--> statement-breakpoint
UPDATE "student_course_assignments" s SET "course_id" = v."course_id" FROM "course_versions" v WHERE v."id" = s."version_id";--> statement-breakpoint
ALTER TABLE "student_course_assignments" ALTER COLUMN "course_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "student_course_assignments" DROP CONSTRAINT "student_course_assignments_pkey";--> statement-breakpoint
ALTER TABLE "student_course_assignments" ADD CONSTRAINT "student_course_assignments_user_id_course_id_pk" PRIMARY KEY("user_id","course_id");--> statement-breakpoint
ALTER TABLE "assignment_history" ADD COLUMN "course_id" text;--> statement-breakpoint
UPDATE "assignment_history" h SET "course_id" = COALESCE((SELECT v."course_id" FROM "course_versions" v WHERE v."id" = h."version_id"), 'math-start');--> statement-breakpoint
ALTER TABLE "assignment_history" ALTER COLUMN "course_id" SET NOT NULL;--> statement-breakpoint
-- One fallback per course instead of one overall: each chapter course has its own default version.
DROP INDEX "course_versions_one_fallback";--> statement-breakpoint
CREATE UNIQUE INDEX "course_versions_one_fallback" ON "course_versions" USING btree ("course_id") WHERE "course_versions"."is_fallback";
