-- Self-serve account deletion without shipping the service-role key to the app.
-- Lives in a private schema (not exposed by Supabase's Data API); only the app's DB role may call it.
CREATE SCHEMA IF NOT EXISTS app_private;
--> statement-breakpoint
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_private.delete_auth_user(uid uuid) RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ DELETE FROM auth.users WHERE id = uid $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_private.delete_auth_user(uuid) FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION app_private.delete_auth_user(uuid) FROM anon, authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'openprep_app') THEN
    GRANT USAGE ON SCHEMA app_private TO openprep_app;
    GRANT EXECUTE ON FUNCTION app_private.delete_auth_user(uuid) TO openprep_app;
  END IF;
END $$;
