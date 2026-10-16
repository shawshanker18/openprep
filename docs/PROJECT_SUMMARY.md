# OpenPrep: project summary

Last updated 16 October 2026. This is a working summary for the team: what the product is, how the code is laid out,
what has been built, the commands we use, and what is still open. Credentials and keys are never written here.

## 1. What it is

OpenPrep is a free, open-source, adaptive SAT practice site. It is aimed at students in CBSE (India) Classes 9 to 12
and at SAT candidates generally. A student can start with the question bank, Smart Practice or practice tests right
after onboarding. An optional diagnostic gives a starting skill profile, and practice answers keep adjusting it.

- Live site: openprep.site
- Code: AGPL-3.0. Content (questions and lessons): CC BY-NC-SA 4.0.
- Repository: github.com/Shashanksaraswat123939/openprep (private source; the README points to a public overview repo).

## 2. Stack

- **Framework:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS 4 with shadcn-style components.
- **Database and auth:** Supabase (Postgres, Auth, RLS on every public table). The app connects through
  `DATABASE_URL` as the least-privilege role `openprep_app`. Migrations use `MIGRATE_DATABASE_URL` (owner).
- **ORM:** Drizzle (schema in `src/db/schema.ts`, migrations in `drizzle/`).
- **Maths:** KaTeX through `remark-math` and `rehype-katex`. Lessons and questions are Markdown with `$...$` maths.
- **Graphing:** Desmos API (`NEXT_PUBLIC_DESMOS_API_KEY`), with a hosted fallback.
- **AI tutor:** the Vercel AI SDK, with Anthropic, OpenAI, Google and OpenRouter providers. It is optional.
- **Other:** Upstash rate limiting, web push reminders, Cloudflare R2 for question images, Vitest for tests.

Environment variables (names only): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`,
`MIGRATE_DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `AI_MODEL`, `ANTHROPIC_API_KEY`, `AI_DAILY_LIMIT`,
`NEXT_PUBLIC_DESMOS_API_KEY`, `DEV_USER_ID` (local only), `CRON_SECRET`, `QUESTION_ID_SECRET`, and the VAPID keys.
The full list is in `.env.example`.

## 3. Repository layout

| Path | What is there |
|---|---|
| `src/app/(app)/` | Signed-in student pages: dashboard, start (lessons), practice, tests, analysis, progress, plan, settings, desmos, skills |
| `src/app/(static)/` | Public SEO pages: homepage, SAT Math / Reading and Writing hubs, practice tests, CBSE page, about, privacy, terms |
| `src/app/admin/` | Admin panel (see section 6) |
| `src/app/onboarding/`, `src/app/login/`, `src/app/auth/` | Sign-up, sign-in, and onboarding survey |
| `src/app/api/` | Chat, cron (tick and warm), question assets, test submission |
| `src/components/` | Shared UI: lesson views, practice runner, Desmos panel, nav, markdown, `ui/` primitives |
| `src/engine/` | Pure logic with no database access: mastery model, question selection, diagnostic, scoring, daily plan, review queue, course assignment rules |
| `src/server/` | Server modules that touch the database: practice sessions, delivery, questions, concepts, course assignment, admin |
| `src/content/` | Taxonomy (29 SKILLS in 4 SAT domains), CBSE chapters, chapter-course starting data, getting-started steps |
| `content/questions/` | Authored question bank as JSON (261 questions, 9 per skill) |
| `content/lessons/` | One Markdown lesson per skill (29) |
| `content/desmos/` | Desmos lessons (8) |
| `drizzle/` | SQL migrations 0000 to 0025 and their snapshots |
| `docs/` | Design notes for question pools, delivery security, saved practice, the CBSE roadmap, and repair status |
| `scripts/` | Content validation and seeding, admin CLI, enable-RLS, verify |

Engine modules, briefly: `mastery.ts` is an Elo and 1PL-IRT hybrid student model. `select.ts` picks a skill and then a
question. `diagnostic.ts` runs a 24-question adaptive diagnostic (8 domains by 3). `review.ts` is a spaced-repetition
queue for misses (+1, +3, +7 days). `plan.ts` builds the daily plan, which is generated once per local day and never
rearranged. `score.ts` handles test scoring and estimates. `assignment.ts` is the pure course-assignment rule engine.

## 4. Main product areas

- **Onboarding and profile:** class, curriculum (CBSE, ICSE, IB, GCSE, American, other), subjects, English background,
  target score, test date, study time. For CBSE Class 11 students who study Mathematics, a chapter checklist covers
  the six course chapters: Relations and Functions, Trigonometric Functions, Straight Lines, Linear Inequalities,
  Conic Sections, Statistics. Classes 9, 10 and 12 are not asked about subjects or chapters.
- **Start from scratch (`/start`):** an ordered path of lessons. Each skill has a lesson (key ideas, formulas and
  concepts, worked examples, common traps), a checkpoint, and concept practice. Desmos lessons sit alongside.
- **Practice (`/practice`):** Smart Practice (adaptive), skill sets, question-bank lists, saved sessions, and
  "Try a question" on each lesson concept. Sessions are saved in the database and can be resumed.
- **Tests (`/tests`, `/test/[sessionId]`):** full mock tests, sections, modules, and the diagnostic. These use the
  test pool, which is separate from study questions.
- **Analysis and progress:** mastery per skill, activity heatmap with streaks, mistakes list, score estimates.
- **Course assignment:** CBSE chapter courses. Each course has a default version (taught from the basics, and the
  fallback) and a covered-at-school version. Rules pick which version each student gets, from the chapters they
  finished. Reassignment never changes lesson progress.
- **Settings:** profile, chapters, subjects, official scores, reminders, account deletion.

## 5. Data model (main tables)

- **Students:** `profiles` (grade, curriculum, subjects, `chapters_done`, goals), `skill_state` (per-skill theta and
  mastery), `lesson_progress`, `daily_plans`.
- **Questions:** `questions` (stem, choices, answer, explanation, rationales, Desmos block, tags, difficulty, `pool`
  study or test). `question_exposures` records what each student has been given. `question_serves` holds in-progress
  deliveries. `attempts` holds answers.
- **Practice and tests:** `practice_sessions`, `practice_session_items`, `test_sessions`, `test_modules`, `test_items`.
- **Concepts:** `skill_concepts` (title, explanation, order) and `concept_questions` (which study questions a concept
  uses). Added in migration 0025.
- **Course assignment:** `courses`, `course_skills`, `course_versions`, `course_version_lessons`, `assignment_rules`,
  `student_course_assignments`, `assignment_history`, `user_groups`, `user_group_members`.
- **Admin and safety:** `admins`, `admin_audit`, `feedback`, `question_reports`, `security_reports`, `ai_messages`,
  `ai_cache`, rate-limit windows.

Every public table has RLS enabled with no policies. The public anon key cannot read any data. All access goes through
the server.

## 6. Admin panel (`/admin`)

Reached only by accounts in the `admins` table. Everyone else gets a 404. Tabs:

- **Overview:** headline numbers.
- **Inbox:** feedback, question reports, security reports.
- **Users and activity:** user directory and detail, recent activity.
- **Question exposure:** how often each question has been shown.
- **Course assignment:** courses, versions (with lesson text and publish), and rules (with impact preview and conflict
  warnings). Publishing re-checks every student.
- **Concepts:** for each skill, add concepts with an explanation and pick their study questions. Only study-pool
  questions of that skill are accepted.
- **Groups:** user groups for group-scoped rules.
- **Audit log:** every admin write is recorded.

Admins are granted from the database (SQL or `npm run admin -- grant <email>`), never from the site.

## 7. Content pipeline

1. Authored lessons and questions live in git: `content/lessons/*.md` and `content/questions/*.json`.
2. `npm run content:validate` checks headings, frontmatter, maths and question structure.
3. `npm run content:seed` upserts them into the database. Questions removed from the source are retired, never deleted.
4. Lesson headings must be exactly: What this skill is, Key ideas, Formulas and rules, Worked example 1 (easy),
   Worked example 2 (SAT-level), Common traps, The fast way (and when to use Desmos). Concepts are `###` blocks inside
   Formulas and rules.

Heads-up: the database holds about 13,500 active study and test questions, most of which are not in the repo, and none
of them has an explanation in the `explanation_md` column. The repo's 261 questions are the only ones with explanations.

## 8. Design style

- **Look:** quiet and neutral. Near-black primary text on white (dark mode mirrors it). Light grey muted surfaces,
  thin borders, and few colours. Brand-neutral: the SAT trademark note is in the footer.
- **Typography:** Geist Sans for text and Geist Mono for code, from `next/font`. Headings are semibold, body text 15 to
  17 px, and lesson text scales with the A+/A− control (stored per device).
- **Shape:** rounded corners from one radius variable (`--radius`). Cards are `rounded-xl` with a 1 px border, and
  boxes are for things a student acts on or opens. Most content sits in plain flow, not in boxes.
- **Expandable things:** the Start page groups and lesson concepts and worked examples are `details` boxes. They
  show a chevron that turns when open, with the same padding and hover as the Start page cards.
- **Motion:** only a short fade-in on reveals (`lesson-reveal`, 180 ms).
- **Layout:** the main column is about 768 px wide at desktop. The lesson view keeps Desmos beside the text on wide
  screens. Pages are checked at phone width (375 px) for sideways overflow.
- **Accessibility:** buttons are at least 44 px tall on touch, focus rings are visible, icon-only buttons have labels,
  and the lesson text can be made larger.

## 9. Commands

```bash
npm install                  # install dependencies from package-lock.json
npm run dev                  # local dev server (next dev); uses DEV_USER_ID to skip sign-in, dev only
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint
npm test                     # vitest run (unit tests and PGlite-backed database tests)
npm run content:validate     # check lessons and questions
npm run content:seed         # upsert content into the database
npm run db:generate          # drizzle-kit generate, after a schema edit
npm run db:migrate           # drizzle-kit migrate, needs MIGRATE_DATABASE_URL
npm run admin -- grant <email> "note"    # also: revoke <email>, list
bash scripts/verify.sh       # typegen, typecheck, lint, unit tests, production build, in that order
npx next build               # production build
```

Before reporting a change as done, run `bash scripts/verify.sh`, and then check the affected page in a browser (see
Conventions above).

Windows notes: the shell is Git Bash. Files are CRLF in the working copy, and Git warns when it converts them. Use
`git -c user.name=... -c user.email=...` for commits rather than changing the local config.

## 10. Conventions

- **Commits:** author is the project owner (Shashanksaraswat123939, GitHub no-reply email). No co-author lines.
- **Autocommit and push (default):** after each finished change, commit to `main` and push to `origin/main`. Do not
  stop to ask first. Stop doing this only when the owner says so explicitly, for example "don't push" or "don't
  commit". The project owner set this rule on 16 October 2026.
- **Big UI or feature changes: build and test first.** Before calling a UI or feature change done, run
  `bash scripts/verify.sh` (it must pass, including the production build), then check the changed page in the
  browser (desktop and phone width, and the flow end to end). Test data written to the database for a check
  (sessions, concepts, progress) must be removed afterwards. Report what was and was not checked.
- **Migrations:** write them with `drizzle-kit generate`, review the SQL, and apply them deliberately. Check the
  ledger (`drizzle.__drizzle_migrations`) before assuming `db:migrate` will apply anything.
- **Questions:** the `pool` decides where a question can be used. Study questions feed practice and the question bank.
  Test questions feed mock tests and the diagnostic only, and a student sees a test question in practice only after
  answering it.
- **Delivery:** a question has to be exposed to a student (recorded in `question_exposures`) before the student can
  answer it. Every practice set and checkpoint goes through the same exposure ledger, with rate limits.
- **Engine vs server:** `src/engine` has no database access and is unit-tested directly. Anything that reads or writes
  the database lives in `src/server`.

## 11. Recent history (October 2026)

- **Oct 10:** SEO hub pages and sitemap, dashboard and Start layout, activity heatmap, the individual-modules menu,
  adaptive practice tests.
- **Oct 11:** the AI tutor was removed and then restored by a revert.
- **Oct 12:** analysis, question bank, adaptive practice, CBSE course assignment.
- **Oct 14:** chapter courses with default and covered versions, groups and group-scoped rules, data-driven chapter
  activity, Class 11 only chapter picker with six course chapters, migration 0024 applied to `openprep-dev`.
- **Oct 16:** conceptual practice (migration 0025: concepts and their questions), lesson concepts and worked examples
  in boxes, the checkpoint button, a fix that stopped list sets from ending early when a question was unavailable, and
  "Try a question" on each lesson concept (three questions, with "Save and leave" returning to the lesson).

## 12. Known gaps and open decisions

1. **Completion is self-reported.** "Done, next topic" needs no check. Khan Academy and ALEKS verify mastery with
   checkpoints and levels. We have not built that yet. Checkpoints run but do not record a score or change a level.
2. **Checkpoints are not gated.** Nothing stops a student moving on without one.
3. **Concept labels repeat.** Lesson concepts are numbered "Concept 1…N", and the admin concepts section on a finished
   lesson also starts at "Concept 1". Decide whether to rename one of them.
4. **Concept coverage is by title.** "Try a question" uses the admin concept whose title matches a lesson concept
   exactly. Concepts are not yet written for most skills.
5. **Content.** Only 261 repo questions have explanations. The database bank (about 13,500) has none. Worked examples
   and concepts were checked by hand, not against an answer key.
6. **Duplicated rendering in dev.** Some pages (Settings, Analysis, lessons) show their headings twice in the browser.
   This was already there before the recent lesson work. It has not been traced to the cause or checked in a
   production build.
7. **Onboarding survey not browser-tested** since the subject and chapter rules changed. It needs a fresh account.
8. **Migration ledger.** `drizzle.__drizzle_migrations` lists migration 0024 as applied, but its tables were missing
   until they were applied by hand. Migrations 0022 and 0023 may have similar drift.
9. **Local dev port.** Port 3000 on this machine is held by an old process that cannot be stopped from the current
   session. Use another port (for example 3200).

## 13. Where to look

- Lesson layout: `src/components/lesson-study-view.tsx`, and the lesson page in `src/app/(app)/start/[step]/page.tsx`.
- Practice runner and list sets: `src/app/(app)/practice/practice-runner.tsx`, `src/server/practice.ts`,
  `src/server/practice-sessions.ts`.
- Concepts and checkpoints: `src/server/concepts.ts`, and the admin pages in `src/app/admin/concepts/`.
- Course assignment: `src/engine/assignment.ts` (rules), `src/server/course-assignment.ts` (persistence),
  `src/server/assignment-admin.ts` (admin writes).
- Question delivery rules: `docs/QUESTION_POOLS.md` and `docs/QUESTION_DELIVERY_SECURITY.md`.
