CREATE TABLE "delivery_guards" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_windows" (
	"id" text PRIMARY KEY NOT NULL,
	"times" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_exposures" (
	"user_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"ip_hash" text,
	"device_hash" text,
	"first_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_exposures_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "question_exposures" ADD CONSTRAINT "question_exposures_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_exposures" ADD CONSTRAINT "question_exposures_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exposure_user_time" ON "question_exposures" USING btree ("user_id","first_at");--> statement-breakpoint
CREATE INDEX "exposure_skill_time" ON "question_exposures" USING btree ("user_id","skill_id","first_at");--> statement-breakpoint
CREATE INDEX "exposure_ip_time" ON "question_exposures" USING btree ("ip_hash","first_at");--> statement-breakpoint
CREATE INDEX "exposure_device_time" ON "question_exposures" USING btree ("device_hash","first_at");--> statement-breakpoint
CREATE INDEX "exposure_question_time" ON "question_exposures" USING btree ("question_id","first_at");
--> statement-breakpoint
ALTER TABLE public.question_exposures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.question_exposures FROM PUBLIC;
DO $roles$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON public.question_exposures FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON public.question_exposures FROM authenticated; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='openprep_app') THEN GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_exposures TO openprep_app; END IF;
END $roles$;

--> statement-breakpoint
ALTER TABLE public.delivery_guards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_guards FROM PUBLIC;
DO $roles$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON public.delivery_guards FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON public.delivery_guards FROM authenticated; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='openprep_app') THEN GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_guards TO openprep_app; END IF;
END $roles$;

--> statement-breakpoint
ALTER TABLE public.delivery_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_windows FROM PUBLIC;
DO $roles$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON public.delivery_windows FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON public.delivery_windows FROM authenticated; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='openprep_app') THEN GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_windows TO openprep_app; END IF;
END $roles$;

--> statement-breakpoint
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.questions FROM PUBLIC;
DO $roles$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON public.questions FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON public.questions FROM authenticated; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='openprep_app') THEN GRANT UPDATE(status) ON public.questions TO openprep_app; END IF;
END $roles$;

--> statement-breakpoint
-- Existing students retain access to genuinely delivered content; historical views are not new exposures.
INSERT INTO public.question_exposures(user_id,question_id,skill_id,first_at)
SELECT seen.user_id,seen.question_id,q.skill_id,min(seen.at)
FROM (SELECT user_id,question_id,created_at AS at FROM public.attempts
      UNION ALL SELECT user_id,question_id,served_at FROM public.question_serves) seen
JOIN public.questions q ON q.id=seen.question_id
GROUP BY seen.user_id,seen.question_id,q.skill_id
ON CONFLICT(user_id,question_id) DO NOTHING;
