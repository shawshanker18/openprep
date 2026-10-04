-- One row per profile, fixed ten-second windows, atomic under concurrent requests.
create table if not exists public.practice_rate_windows (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  window_start timestamptz not null,
  requests integer not null check(requests>=0)
);
alter table public.practice_rate_windows enable row level security;
revoke all on public.practice_rate_windows from anon, authenticated;
grant select,insert,update on public.practice_rate_windows to openprep_app;
