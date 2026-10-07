-- Google Auth verifies the identity; the hook uses Auth-owned app metadata, not user metadata.
-- Keep single-use email reservations and expiry. Remove shared-network daily account caps.
CREATE OR REPLACE FUNCTION public.hook_signup_cap(event jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  addr text := lower(event->'user'->>'email');
  provider text := coalesce(event->'user'->'app_metadata'->>'provider', event->'user'->'raw_app_meta_data'->>'provider');
  ticket public.signup_tickets;
BEGIN
  IF provider = 'google' AND coalesce(addr, '') <> '' THEN
    RETURN '{}'::jsonb;
  END IF;
  SELECT * INTO ticket FROM public.signup_tickets
    WHERE email = addr AND used_at IS NULL AND created_at > now() - interval '30 minutes'
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', jsonb_build_object('http_code', 403,
      'message', 'Please continue with email on the OpenPrep website or app.'));
  END IF;
  UPDATE public.signup_tickets SET used_at = now() WHERE id = ticket.id;
  RETURN '{}'::jsonb;
END $$;
