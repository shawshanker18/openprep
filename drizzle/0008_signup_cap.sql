CREATE TABLE "signup_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"ip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "signup_tickets_email_idx" ON "signup_tickets" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "signup_tickets_ip_idx" ON "signup_tickets" USING btree ("ip","used_at");--> statement-breakpoint
ALTER TABLE "signup_tickets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Supabase Auth "before user created" hook (Postgres function). A new account is only created when our server
-- issued a fresh ticket for that email, and at most 3 per IP (the ticket's IP, seen by our server) per 24 hours.
-- Existing users signing in never reach this: it only runs when an account is about to be created.
CREATE OR REPLACE FUNCTION public.hook_signup_cap(event jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  addr text := lower(event->'user'->>'email');
  ticket public.signup_tickets;
  used int;
BEGIN
  SELECT * INTO ticket FROM public.signup_tickets
    WHERE email = addr AND used_at IS NULL AND created_at > now() - interval '30 minutes'
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', jsonb_build_object('http_code', 403,
      'message', 'Please create your account on the OpenPrep website or app.'));
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('signup:' || ticket.ip)); -- two sign-ups from one IP can't both slip under the cap
  SELECT count(*) INTO used FROM public.signup_tickets WHERE ip = ticket.ip AND used_at > now() - interval '24 hours';
  IF used >= 3 THEN
    RETURN jsonb_build_object('error', jsonb_build_object('http_code', 429,
      'message', 'Too many new accounts from your network today. Please try again tomorrow.'));
  END IF;
  UPDATE public.signup_tickets SET used_at = now() WHERE id = ticket.id;
  RETURN '{}'::jsonb;
END $$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.hook_signup_cap(jsonb) FROM PUBLIC;--> statement-breakpoint
DO $$ BEGIN
  -- Supabase roles (absent in the local test database). Only Auth may run the hook; the app may only add tickets.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT EXECUTE ON FUNCTION public.hook_signup_cap(jsonb) TO supabase_auth_admin;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.hook_signup_cap(jsonb) FROM anon, authenticated;
    REVOKE ALL ON public.signup_tickets FROM anon, authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'openprep_app') THEN
    GRANT SELECT, INSERT, DELETE ON public.signup_tickets TO openprep_app;
  END IF;
END $$;
