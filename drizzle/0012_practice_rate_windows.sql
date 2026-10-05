-- The practice fallback limiter used to require a manually applied script.
-- IF NOT EXISTS also supports projects where that script has already been applied.
CREATE TABLE IF NOT EXISTS public.practice_rate_windows (
  user_id uuid PRIMARY KEY,
  window_start timestamptz NOT NULL,
  requests integer NOT NULL CHECK (requests >= 0),
  CONSTRAINT practice_rate_windows_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE public.practice_rate_windows ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON public.practice_rate_windows FROM PUBLIC;
--> statement-breakpoint
DO $roles$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.practice_rate_windows FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.practice_rate_windows FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'openprep_app') THEN
    GRANT SELECT, INSERT, UPDATE ON public.practice_rate_windows TO openprep_app;
  END IF;
END $roles$;
