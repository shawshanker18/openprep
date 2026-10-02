CREATE TABLE "security_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip" text NOT NULL,
	"contact" text,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "security_reports_ip_idx" ON "security_reports" USING btree ("ip","created_at");--> statement-breakpoint
ALTER TABLE "security_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.security_reports FROM anon, authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'openprep_app') THEN
    GRANT SELECT, INSERT ON public.security_reports TO openprep_app;
  END IF;
END $$;
