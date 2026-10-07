-- Dropped on 2026-10-07 (migration "drop_unused_private_paper_tables"): private.paper_answers, private.paper_items,
-- private.papers. They were empty, nothing in the app, scripts, functions, views or triggers referenced them, and the
-- app now builds practice papers from an encrypted token (src/server/papers.ts) instead. Kept only so they can be
-- recreated if ever needed. private.paper_blueprints (4 rows) was left in place.
-- RLS was enabled with no policies on all three; re-enable it if you restore them.

create table private.papers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  blueprint_id uuid not null references private.paper_blueprints(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours')
);
create index papers_user_created_idx on private.papers (user_id, created_at desc);

create table private.paper_items (
  paper_id uuid not null references private.papers(id) on delete cascade,
  item_id uuid primary key default gen_random_uuid(),
  ordinal smallint not null check (ordinal > 0),
  question_id uuid not null references private.question_bank(id),
  served_at timestamptz,
  unique (paper_id, ordinal),
  unique (paper_id, question_id)
);

create table private.paper_answers (
  paper_id uuid not null references private.papers(id) on delete cascade,
  item_id uuid not null references private.paper_items(item_id) on delete cascade,
  response text,
  correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (paper_id, item_id)
);

alter table private.papers enable row level security;
alter table private.paper_items enable row level security;
alter table private.paper_answers enable row level security;
