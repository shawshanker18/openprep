CREATE TABLE "ai_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" text,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"context" text NOT NULL,
	"session_id" uuid,
	"response" text,
	"correct" boolean NOT NULL,
	"time_ms" integer NOT NULL,
	"confidence" smallint,
	"mistake_type" text,
	"theta_before" real NOT NULL,
	"theta_after" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"user_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "daily_plans" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"blocks" jsonb NOT NULL,
	CONSTRAINT "daily_plans_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"user_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_skill_id_pk" PRIMARY KEY("user_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"onboarding_step" text DEFAULT 'survey' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"grade" smallint,
	"curriculum" text,
	"topics_studied" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"english_background" text,
	"prior_math" smallint,
	"prior_rw" smallint,
	"target_score" smallint,
	"test_date" date,
	"minutes_per_day" smallint DEFAULT 45 NOT NULL,
	"days_per_week" smallint DEFAULT 5 NOT NULL,
	"weekly_focus" jsonb
);
--> statement-breakpoint
CREATE TABLE "question_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_id" text NOT NULL,
	"section" text NOT NULL,
	"domain" text NOT NULL,
	"difficulty" smallint NOT NULL,
	"type" text NOT NULL,
	"passage_md" text,
	"stem_md" text NOT NULL,
	"choices" jsonb,
	"answer" jsonb NOT NULL,
	"explanation_md" text NOT NULL,
	"choice_rationales" jsonb,
	"fast_method_md" text,
	"desmos" jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_items" (
	"user_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"stage" smallint DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	CONSTRAINT "review_items_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "sat_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"taken_on" date NOT NULL,
	"math" smallint NOT NULL,
	"rw" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" text NOT NULL,
	"math" smallint NOT NULL,
	"rw" smallint NOT NULL,
	"half_width" smallint NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_state" (
	"user_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"self_rating" smallint,
	"theta" real DEFAULT 0 NOT NULL,
	"n" integer DEFAULT 0 NOT NULL,
	"n_correct" integer DEFAULT 0 NOT NULL,
	"total_time_ms" integer DEFAULT 0 NOT NULL,
	"last_practiced_at" timestamp with time zone,
	CONSTRAINT "skill_state_user_id_skill_id_pk" PRIMARY KEY("user_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "test_items" (
	"module_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"question_id" text NOT NULL,
	"response" text,
	"flagged" boolean DEFAULT false NOT NULL,
	"time_ms" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "test_items_module_id_position_pk" PRIMARY KEY("module_id","position")
);
--> statement-breakpoint
CREATE TABLE "test_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"idx" smallint NOT NULL,
	"section" text NOT NULL,
	"route" text DEFAULT 'base' NOT NULL,
	"time_limit_s" integer,
	"started_at" timestamp with time zone,
	"deadline_at" timestamp with time zone,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "test_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"result" jsonb
);
--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sat_attempts" ADD CONSTRAINT "sat_attempts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_snapshots" ADD CONSTRAINT "score_snapshots_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_state" ADD CONSTRAINT "skill_state_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_items" ADD CONSTRAINT "test_items_module_id_test_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."test_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_items" ADD CONSTRAINT "test_items_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_modules" ADD CONSTRAINT "test_modules_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_user_time" ON "ai_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "att_user_time" ON "attempts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "att_user_skill_time" ON "attempts" USING btree ("user_id","skill_id","created_at");--> statement-breakpoint
CREATE INDEX "att_user_question" ON "attempts" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE INDEX "q_skill_diff" ON "questions" USING btree ("skill_id","difficulty","status");--> statement-breakpoint
CREATE INDEX "rev_user_due" ON "review_items" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "ss_user_time" ON "score_snapshots" USING btree ("user_id","taken_at");--> statement-breakpoint
CREATE INDEX "tm_session" ON "test_modules" USING btree ("session_id","idx");--> statement-breakpoint
CREATE INDEX "ts_user_time" ON "test_sessions" USING btree ("user_id","started_at");