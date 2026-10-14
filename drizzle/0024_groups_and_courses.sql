CREATE TABLE "course_skills" (
	"skill_id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_skills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"chapter_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_group_members" (
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"added_by" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_group_members_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "user_group_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_groups_name_check" CHECK (length("user_groups"."name") between 1 and 80)
);
--> statement-breakpoint
ALTER TABLE "user_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assignment_rules" ALTER COLUMN "condition" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_rules" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "course_skills" ADD CONSTRAINT "course_skills_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_group_id_user_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."user_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_group_members_user_idx" ON "user_group_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_groups_name_unique" ON "user_groups" USING btree (lower("name"));--> statement-breakpoint
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_group_id_user_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."user_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_scope_check" CHECK ("assignment_rules"."condition" is not null or "assignment_rules"."group_id" is not null);--> statement-breakpoint
-- The five Class 11 chapter courses, so skills and titles exist wherever this migration runs. Admins can add more courses
-- and edit these in /admin/assignments; running this again never overwrites their changes.
INSERT INTO "courses" ("id", "title", "chapter_id") VALUES
	('straight-lines', 'Straight Lines', 'cbse-11-straight-lines'),
	('relations-functions', 'Relations and Functions', 'cbse-11-relations-functions'),
	('conic-sections', 'Conic Sections', 'cbse-11-conic-sections'),
	('trig-functions', 'Trigonometric Functions (unit circle)', 'cbse-11-trigonometric-functions'),
	('statistics', 'Statistics', 'cbse-11-statistics')
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "course_skills" ("skill_id", "course_id") VALUES
	('m-alg-linfunc', 'straight-lines'), ('m-alg-lin2', 'straight-lines'),
	('m-adv-nonlin-func', 'relations-functions'),
	('m-geo-circles', 'conic-sections'), ('m-adv-nonlin-eq', 'conic-sections'),
	('m-geo-trig', 'trig-functions'),
	('m-psda-onevar', 'statistics'), ('m-psda-twovar', 'statistics')
ON CONFLICT ("skill_id") DO NOTHING;
