-- Server-only role; Supabase browser roles cannot read private question bytes or bank.
grant usage on schema private to openprep_app;
grant select (id,mime_type,bytes) on private.question_assets to openprep_app;
revoke all on private.question_assets from anon, authenticated;
revoke all on private.question_bank from anon, authenticated;
