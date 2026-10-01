# OpenPrep

Free, open-source adaptive SAT prep. A student takes a short adaptive diagnostic, gets a per-skill mastery profile and a
score range, then practises what has the most points left to gain. Next.js 16 + Supabase (Postgres + Auth) + Drizzle.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in (see below)
npm run dev
```

`DEV_USER_ID=<any uuid>` in `.env.local` signs you in as that user **under `next dev` only** (ignored in production
builds), so flows can be exercised without real sign-in.

## Checks

```bash
npm run typecheck && npm run lint && npm test && npm run content:validate
```

Engine tests are pure; `src/server/*.test.ts` run the real SQL against in-process Postgres (PGlite).

## Database

- Schema: `src/db/schema.ts`; migrations in `drizzle/` (`npm run db:generate` after schema edits).
- Every public table has RLS enabled with **no policies**: the public anon key can read nothing. The app connects
  server-side through the Supabase transaction pooler.
- The app connects as a least-privilege role, `openprep_app` (rows only, no DDL). Create it once per Supabase project
  (SQL editor, as `postgres`), with your own generated password:

  ```sql
  create role openprep_app with login bypassrls password '<generate a long random password>';
  grant usage on schema public to openprep_app;
  grant select, insert, update, delete on all tables in schema public to openprep_app;
  grant usage, select on all sequences in schema public to openprep_app;
  alter default privileges for role postgres in schema public grant select, insert, update, delete on tables to openprep_app;
  alter default privileges for role postgres in schema public grant usage, select on sequences to openprep_app;
  ```

  `DATABASE_URL=postgresql://openprep_app.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`
- Migrations need owner rights: set `MIGRATE_DATABASE_URL` (session pooler, port 5432, `postgres` user) and run
  `npm run db:migrate`. The Vercel build runs migrations **only if** `MIGRATE_DATABASE_URL` is set; otherwise it only
  seeds content and builds.
- Account deletion uses `app_private.delete_auth_user(uuid)` (migration `0001`), callable only by `openprep_app` — the
  service-role key is not needed by the app.

## Content

Questions (`content/questions/<skill-id>.json`) and lessons (`content/lessons/<skill-id>.md`) live in git; see
`content/AUTHORING.md`. `npm run content:seed` upserts them (idempotent; removed questions are retired, never deleted).
All content must be original.

## Deploy (Vercel)

Import the repo, region `bom1` (set in `vercel.json`, next to Supabase `ap-south-1`). Environment variables:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `AI_MODEL`,
`ANTHROPIC_API_KEY` (optional — the tutor shows a friendly message without it), `AI_DAILY_LIMIT`,
`NEXT_PUBLIC_DESMOS_API_KEY` (optional — falls back to a link). Then in Supabase → Authentication → URL configuration,
add `https://<your-domain>/auth/callback` to the redirect URLs and set the Site URL.

## Licence

Code AGPL-3.0. Content (questions, lessons) CC BY-NC-SA 4.0. SAT® is a trademark registered by the College Board,
which is not affiliated with, and does not endorse, OpenPrep.
