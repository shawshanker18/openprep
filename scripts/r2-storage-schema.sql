create table public.r2_files (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete restrict,
  object_key text not null unique,
  content_type text not null check (content_type in ('image/png','image/jpeg','image/webp','image/gif','application/pdf')),
  byte_size integer not null check (byte_size between 1 and 3145728),
  status text not null default 'pending' check (status in ('pending','ready')),
  created_at timestamptz not null default now()
);
create index r2_files_owner_created_idx on public.r2_files(owner_id, created_at desc);
alter table public.r2_files enable row level security;
revoke all on public.r2_files from public, anon, authenticated;
grant select (id, owner_id, content_type, byte_size, status, created_at) on public.r2_files to authenticated;
create policy r2_files_read_own on public.r2_files for select to authenticated
using (owner_id = (select auth.uid()) and status = 'ready');
-- This existing application role bypasses RLS. Every application query also checks the verified owner.
grant select, insert, update, delete on public.r2_files to openprep_app;
create function public.r2_file_quota() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text, 81231));
  if (select count(*) from public.r2_files where owner_id = new.owner_id) >= 100
     or (select coalesce(sum(byte_size), 0) from public.r2_files where owner_id = new.owner_id) + new.byte_size > 104857600 then
    raise exception 'File quota exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.r2_file_quota() from public, anon, authenticated;
grant execute on function public.r2_file_quota() to openprep_app;
create trigger r2_file_quota_check before insert on public.r2_files
for each row execute function public.r2_file_quota();
