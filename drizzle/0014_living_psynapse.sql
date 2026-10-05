CREATE TABLE "practice_session_items" (
	"session_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"question_id" text NOT NULL,
	"response" text,
	"time_ms" integer DEFAULT 0 NOT NULL,
	"attempt_id" uuid,
	"served_at" timestamp with time zone NOT NULL,
	CONSTRAINT "practice_session_items_session_id_position_pk" PRIMARY KEY("session_id","position"),
	CONSTRAINT "practice_session_items_position_check" CHECK ("practice_session_items"."position" >= 0 and "practice_session_items"."position" < 100),
	CONSTRAINT "practice_session_items_time_check" CHECK ("practice_session_items"."time_ms" >= 0 and "practice_session_items"."time_ms" <= 86400000),
	CONSTRAINT "practice_session_items_response_check" CHECK ("practice_session_items"."response" is null or length("practice_session_items"."response") <= 8)
);
--> statement-breakpoint
ALTER TABLE "practice_session_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"config" jsonb NOT NULL,
	"title" text NOT NULL,
	"back" text,
	"cursor" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_sessions_cursor_check" CHECK ("practice_sessions"."cursor" >= 0 and "practice_sessions"."cursor" <= 100),
	CONSTRAINT "practice_sessions_status_check" CHECK ("practice_sessions"."status" in ('active', 'completed'))
);
--> statement-breakpoint
ALTER TABLE "practice_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "practice_sessions_user_time" ON "practice_sessions" USING btree ("user_id","updated_at");
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
   REVOKE ALL ON public.practice_sessions, public.practice_session_items FROM anon;
 END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
   REVOKE ALL ON public.practice_sessions, public.practice_session_items FROM authenticated;
 END IF;
END $$;
