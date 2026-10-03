-- Admin pages show students' emails, which live in auth.users (owned by Supabase Auth; the app's role can't read it).
-- These run as the table owner and return only id, email and sign-in times, never passwords or tokens. Only the
-- app's role may call them, and the app only calls them on admin pages (requireAdmin). Skipped where there is no
-- auth schema (the local test database).
DO $outer$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.admin_user_directory(search text DEFAULT NULL, lim integer DEFAULT 50, skip integer DEFAULT 0)
      RETURNS TABLE (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz)
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $body$
        SELECT u.id, u.email::text, u.created_at, u.last_sign_in_at FROM auth.users u
        WHERE search IS NULL OR search = ''
          OR u.email ILIKE '%' || replace(replace(replace(search, '\', '\'), '%', '\%'), '_', '\_') || '%'
        ORDER BY u.created_at DESC
        LIMIT least(greatest(lim, 1), 200) OFFSET greatest(skip, 0)
      $body$
    $f$;
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.admin_user_emails(ids uuid[])
      RETURNS TABLE (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz)
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $body$
        SELECT u.id, u.email::text, u.created_at, u.last_sign_in_at FROM auth.users u WHERE u.id = ANY(ids[1:500])
      $body$
    $f$;
    REVOKE ALL ON FUNCTION public.admin_user_directory(text, integer, integer) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.admin_user_emails(uuid[]) FROM PUBLIC;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      REVOKE ALL ON FUNCTION public.admin_user_directory(text, integer, integer) FROM anon, authenticated;
      REVOKE ALL ON FUNCTION public.admin_user_emails(uuid[]) FROM anon, authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'openprep_app') THEN
      GRANT EXECUTE ON FUNCTION public.admin_user_directory(text, integer, integer) TO openprep_app;
      GRANT EXECUTE ON FUNCTION public.admin_user_emails(uuid[]) TO openprep_app;
    END IF;
  END IF;
END $outer$;
