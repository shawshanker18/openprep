CREATE TABLE "admin_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"note" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"kind" text NOT NULL,
	"rating" smallint,
	"message" text NOT NULL,
	"page" text,
	"contact" text,
	"ip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"admin_note" text,
	"handled_by" uuid,
	"handled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "question_reports" ADD COLUMN "status" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "question_reports" ADD COLUMN "admin_note" text;--> statement-breakpoint
ALTER TABLE "question_reports" ADD COLUMN "handled_by" uuid;--> statement-breakpoint
ALTER TABLE "question_reports" ADD COLUMN "handled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "security_reports" ADD COLUMN "status" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "security_reports" ADD COLUMN "admin_note" text;--> statement-breakpoint
ALTER TABLE "security_reports" ADD COLUMN "handled_by" uuid;--> statement-breakpoint
ALTER TABLE "security_reports" ADD COLUMN "handled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_time_idx" ON "admin_audit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "feedback_status_idx" ON "feedback" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "feedback_user_idx" ON "feedback" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "feedback_ip_idx" ON "feedback" USING btree ("ip","created_at");--> statement-breakpoint
CREATE INDEX "qr_status_time" ON "question_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "security_reports_status_idx" ON "security_reports" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_kind_check" CHECK ("kind" IN ('bug', 'error', 'review', 'idea', 'other'));--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_rating_check" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_message_check" CHECK (length("message") BETWEEN 1 AND 4000);--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_status_check" CHECK ("status" IN ('new', 'in_progress', 'resolved', 'dismissed'));--> statement-breakpoint
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_status_check" CHECK ("status" IN ('new', 'in_progress', 'resolved', 'dismissed'));--> statement-breakpoint
ALTER TABLE "security_reports" ADD CONSTRAINT "security_reports_status_check" CHECK ("status" IN ('new', 'in_progress', 'resolved', 'dismissed'));--> statement-breakpoint
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_audit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Admin is granted only from the backend: the app's role may READ "admins", never write it (default privileges would
-- otherwise give it insert/update/delete on every new table). The audit log is append-only for the app.
-- The admin pages also need emails: read access to four columns of auth.users, never passwords or tokens.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.feedback, public.admins, public.admin_audit FROM anon, authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'openprep_app') THEN
    REVOKE ALL ON public.admins FROM openprep_app;
    GRANT SELECT ON public.admins TO openprep_app;
    REVOKE ALL ON public.admin_audit FROM openprep_app;
    GRANT SELECT, INSERT ON public.admin_audit TO openprep_app;
    REVOKE ALL ON public.feedback FROM openprep_app;
    GRANT SELECT, INSERT, UPDATE ON public.feedback TO openprep_app;
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
      GRANT USAGE ON SCHEMA auth TO openprep_app;
      GRANT SELECT (id, email, created_at, last_sign_in_at) ON auth.users TO openprep_app;
    END IF;
  END IF;
END $$;
