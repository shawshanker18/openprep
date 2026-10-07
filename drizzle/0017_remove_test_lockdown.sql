-- Retire obsolete test lockdown metadata without touching answers or scores.
UPDATE public.test_sessions SET config = config - 'lockdown' - 'lockKey' - 'focusLost'
WHERE config ?| ARRAY['lockdown', 'lockKey', 'focusLost'];
