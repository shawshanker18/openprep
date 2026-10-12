CREATE TABLE "assignment_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"version_id" text,
	"rule_id" uuid,
	"outcome" text NOT NULL,
	"reason" text NOT NULL,
	"detail" jsonb,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignment_history_outcome_check" CHECK ("assignment_history"."outcome" in ('assigned', 'fallback', 'unresolved'))
);
--> statement-breakpoint
ALTER TABLE "assignment_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assignment_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"target_version_id" text NOT NULL,
	"condition" jsonb NOT NULL,
	"effective_from" timestamp with time zone,
	"effective_until" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignment_rules_status_check" CHECK ("assignment_rules"."status" in ('draft', 'live', 'disabled')),
	CONSTRAINT "assignment_rules_window_check" CHECK ("assignment_rules"."effective_from" is null or "assignment_rules"."effective_until" is null or "assignment_rules"."effective_from" < "assignment_rules"."effective_until")
);
--> statement-breakpoint
ALTER TABLE "assignment_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "course_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_versions_status_check" CHECK ("course_versions"."status" in ('draft', 'published', 'retired'))
);
--> statement-breakpoint
ALTER TABLE "course_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "student_course_assignments" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"version_id" text NOT NULL,
	"rule_id" uuid,
	"outcome" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_course_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assignment_history" ADD CONSTRAINT "assignment_history_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_history" ADD CONSTRAINT "assignment_history_version_id_course_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."course_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_history" ADD CONSTRAINT "assignment_history_rule_id_assignment_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."assignment_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_target_version_id_course_versions_id_fk" FOREIGN KEY ("target_version_id") REFERENCES "public"."course_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_course_assignments" ADD CONSTRAINT "student_course_assignments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_course_assignments" ADD CONSTRAINT "student_course_assignments_version_id_course_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."course_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_course_assignments" ADD CONSTRAINT "student_course_assignments_rule_id_assignment_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."assignment_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignment_history_user_time" ON "assignment_history" USING btree ("user_id","evaluated_at");--> statement-breakpoint
CREATE INDEX "assignment_rules_status_priority_idx" ON "assignment_rules" USING btree ("status","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "course_versions_one_fallback" ON "course_versions" USING btree ("is_fallback") WHERE "course_versions"."is_fallback";