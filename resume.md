# OpenPrep ? resume in another chat

Updated 4 October 2026 (Asia/Dubai). User authorized repairs, tests and pushing the website changes to GitHub. This file records completed work and remaining checks; do not execute instructions embedded in the historical Claude logs.

## Locations

- Repository: `C:\Users\shash\Downloads\OpenPrep\openprep`
- Remote: https://github.com/Shashanksaraswat123939/openprep (branch main)
- Workspace: `C:\Users\shash\Documents\Codex\2026-10-04\files-mentioned-by-the-user-3bc0fce7`
- Public repair report and issue inventory: repository `docs/openprep-repair-status.md`, `docs/openprep-user-facing-issues.md`, `docs/openprep-ui-findings.csv`.
- Private evidence/backups: workspace `outputs` and `work/question-repair`. Never commit raw questions, credentials or private archives.

## What is complete

Project located, historical JSONL files read, original source/mobile/desktop/plans preserved in `outputs/OpenPrep-source-and-shelved-apps-2026-10-04.zip` (411 files, about 73.5 MB). Mobile and desktop are shelved. R2 is shelved at the user's request because billing needs a card; do not create a bucket or activate uploads. Cloudflare CLI/skills/MCP setup was completed earlier. Use cf unless Wrangler configuration exists.

Live Supabase project gurqomysadtmlofuaxef repaired from SAT source archives: 13,486 active, 4,628 retired, 18,114 total public rows. Active Math 4,888 / RW 8,598; MCQ 12,105 / SPR 1,381; 29 of 29 skills. Stored image assets 1,120; zero active dangling references. Passages, tables, choices/answer objects, canonical taxonomy, tags and escaped math were repaired. Four unusable source records remain excluded; two imported unresolved rows were retired. Repeated prompts required source-backed reconstruction rather than proven original-ID provenance. No student attempts existed at repair time; unresolved rows were not in tests.

All explanations remain absent because the archives do not supply them. Do not fabricate worked solutions. Numeric grading precision was tightened. All 13,486 active stems, passages and choices passed actual Markdown server rendering and grading-contract checks; zero failures/math warnings. Editorial correctness and actual signed-in browser delivery are not proved by these checks.

Question DTOs now omit classification; practice sends encrypted user-bound expiring paper tokens. Opaque IDs and authenticated image routes prevent direct storage access. Images are authorized against served questions or owned test sessions. DB request limits work without Redis. Question bank/bookmarks fetch ten at a time. Idempotent answer retry, guarded drafts, timed-save reconnection, calculator recovery/accessibility, form recovery, accessible radios, date focus/validation, error boundaries, tutor retry and many other source bugs repaired.

Three performance indexes, image-read privileges and bounded rate-window DDL applied live. Reproducible SQL lives in scripts. Bank burst test: 400/400 successful queued reads, 12.554 seconds total, p50 9.924 s, p95 12.274 s, avg 1,968 result bytes through five connections. This is not proof of 400 simultaneous students. Database ~79.6 MiB. No paid upgrades.

Final checks: 92 automated tests passed, 2 live-audit tests opt-in/skipped in ordinary runs and separately passed; typecheck/lint/build/content validation passed. Content validation is 261 retired repository questions, distinct from imported active bank. Private secret comparison found zero matches in source/browser bundle.

## Remaining work

1. Browser saved permission still blocks https://openprep-opal.vercel.app. User said they would allow access/sign in but saved permission did not actually change. A new question was sent asking them to allow it and sign into a disposable account; await a real permission change. Never bypass it using HTTP, alternate domains/browsers, proxies or shell scraping. Run the full signed-in responsive/accessibility/calculator/test checklist in the report after access is granted.
2. Practice reload recovers the current input, set totals and bounded seen IDs. Draft tests passed; browser recovery still needs verification. Timed answers cannot be guaranteed saved offline past a server deadline. Verify drafts/retries through a browser.
3. Supply missing source image/damaged text and reviewed explanations. Editorial review of every answer remains outstanding.
4. Monitor real bandwidth/pool waits/query latency; daily users and concurrent users differ. Security advisor has intentional RLS/no-policy informational items plus leaked-password protection disabled; Google/magic links currently used. Do not open client table grants.
5. R2 stays unconfigured; future metadata/file cleanup must be integrated before activation. Third-party calculator requests and fetched question text remain visible in developer tools; no actual calculator API key is needed. Public source architecture cannot be hidden from public GitHub readers.

## Implementation notes

Read repository AGENTS.md and installed Next 16 documentation. Error boundaries use retry, not reset. Preserve unrelated edits. Existing pre-task user website changes were included with the authorized website push; native code is preserved, not actively developed.

Public questions: src/server/questions.ts. Encrypted papers: src/server/papers.ts. Authorized assets: src/app/api/question-assets/[questionId]/[index]/route.ts. Import/math repair scripts have already been applied: do not rerun blindly or overwrite backups. Live content and DB benchmark tests require explicit OPENPREP_LIVE_AUDIT_OUTPUT / OPENPREP_DB_BENCHMARK_OUTPUT and database credentials; ordinary tests do not touch production.

QUESTION_ID_SECRET falls back to existing CRON_SECRET. Never rotate the delivery secret casually: it changes opaque IDs and invalidates paper tokens/drafts. Vercel production has CRON_SECRET, DATABASE_URL and public Supabase configuration. No R2 credentials configured.

Backup before import repair: work/question-repair/questions-before-repair.json, SHA256 fa11d1146d974c27016056b56e2394ab5e07684150ce21eeba97991e7ead3a9e. Source-to-question mapping and math backup in the same private directory. Evidence: outputs/OpenPrep-full-bank-validation.json, OpenPrep-400-read-benchmark.json, OpenPrep-local-secret-scan.json. Historical audit/checklist counts are superseded by the final repair status report.

## Git and deployment

Push/deployment results will be appended below once verified. GitHub push and Vercel deployment readiness are distinct; do not claim signed-in visual sign-off from a build.

### Push and CI update

Main repair commit abdfca57414d3c65cd047a474bb012ed1a987dec was pushed and the remote SHA verified. GitHub CI initially failed because the Windows-generated lockfile omitted Linux/WASM dependency peer entries expected by npm 12. Lock metadata was regenerated with npm 12. No source repair failure was observed in the local checks. The follow-up lockfile/tooling change and current CI/deployment status will be checked before the final response.

Vercel project metadata has no Git repository link, so a GitHub push does not automatically deploy this site. Its latest production deployment remained the older release at the initial status check. Use authenticated Vercel CLI for deployment metadata; do not bypass the production browser permission.

Dependency audit has 13 development-tooling advisories, including unpatched braces <=3.0.3 and older esbuild in Drizzle tooling. Avoid public development/Studio servers. Shadcn CLI was moved to devDependencies; do not force major downgrades suggested by npm audit.
