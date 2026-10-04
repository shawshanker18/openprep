# OpenPrep repair status ? 4 October 2026

## Current result

The active import format, passage restoration, classification, image delivery and server question delivery have been repaired. Local checks passed. Signed-in browser testing remains blocked by the saved permission for the production site. This report does not claim that every UI journey or every editorial answer has been verified.

## Exact database counts

| Measure | Count |
| --- | ---: |
| All public question rows | 18,114 |
| Active questions | 13,486 |
| Retired questions | 4,628 |
| Active Math | 4,888 |
| Active Reading and Writing | 8,598 |
| Multiple choice | 12,105 |
| Numeric response | 1,381 |
| Skills represented | 29 of 29 |
| Separate passage fields | 7,720 |
| Reading and Writing passages retained inline | 878 |
| Stored private assets | 1,120 |
| Active dangling image references | 0 |
| Written explanations supplied by import | 0 |

The Downloads ZIP has 13,492 source records. Four have no usable revamped question/answer. Two further imported rows were retired: one requires an unavailable source image; one is an excess duplicate whose replacement source variant contains damaged text. No source files were deleted. Repeated instruction-only prompts required source-backed reconstruction; original question-ID provenance cannot be proved for all of these variants. No attempts existed at repair time, and unresolved rows were not referenced by test items.

## Repairs

- Source-backed choices, accepted answers, passages, tables, skill/domain/type mappings and canonical tags.
- Escaped text, inline/display math and matrix/alignment repairs. All active stems, passages and choices rendered through the actual Markdown component.
- Authenticated image route requires a question already served to the user or an owned test item. Asset IDs and storage paths stay on the server. Only referenced assets are available.
- Practice fetches use random encrypted paper tokens bound to the user and expiry. Question IDs are opaque keyed identifiers. Public question objects contain only ID, passage, stem and choices; classification is derived on the server.
- Ten questions per bank page and ten bookmarks per page. Narrow test-selection reads and supporting database indexes.
- Atomic database request limits when optional Redis is absent or unavailable; one bounded row per profile.
- Practice submission retries are idempotent. Unsaved practice/test inputs have guarded per-user browser drafts; tests retry saves after reconnection. Server deadlines remain authoritative.
- Calculator load timeout, instance cleanup, graph retention and fullscreen accessibility; submission/loading recovery; accessible radios; date validation/focus; notification scrolling; tutor HTTP errors/retry; login/onboarding/reminder recovery; truthful error screens and web test wording.

## Evidence

- 92 automated tests passed; two explicit live database tests are skipped in ordinary test runs and were executed separately.
- TypeScript, lint, production build and repository content validation passed. Repository content validation covers 261 retired legacy questions, separately from the imported active bank.
- All 13,486 active questions passed server rendering and grading-format checks: zero failures and zero math-format warnings. This checks contracts, not the factual correctness of every answer.
- Private configured secret scan found zero matches in source and generated browser files.
- 400 read-only bank requests succeeded through the application's five-connection pool in 12.554 seconds. Median queued latency 9.924 seconds, p95 12.274 seconds; average serialized result 1,968 bytes. This is a burst queue experiment, not a claim that 400 simultaneous student sessions meet acceptable response times.
- Sampled index optimization reduced one ordered query from 6.333 to 0.196 ms. Database size was 83,490,483 bytes. No paid service upgrade or retention deletion was made.

## Remaining work and realistic limits

1. Allow the production site in the saved browser permission and sign into a disposable account. Exercise the browser checklist below, including actual image display and graded submissions. Browser access must not be bypassed with another URL, shell scraping or a proxy.
2. Supply missing source image/damaged variant if these excluded records should be recovered. Add reviewed explanations; the supplied archives do not contain them. Editorial correctness of all source answers is unverified.
3. Practice reload now restores current input, set totals and bounded seen IDs. Browser storage may be unavailable or cleared; validate the complete recovery journey in a browser. Timed answers cannot be guaranteed saved if offline past the server deadline.
4. Responsive layouts, screen-reader announcements, measured contrast, cross-frame calculator focus and real provider failures still need visual/device testing.
5. Supabase Free capacity depends on traffic, AI/provider usage, attempts/history growth and bandwidth. The successful queued reads do not establish a 400-user capacity guarantee. Monitor actual query latency, pool waits and bandwidth before changing limits.
6. Supabase reports leaked-password protection disabled. The site currently uses Google/magic links; review availability before enabling password auth. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Server-only tables intentionally have RLS and no browser policies, with client grants revoked; do not add public policies just to silence [the informational advisor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
7. Mobile/desktop development and Cloudflare R2 remain shelved. Source is preserved. R2 utilities exist but no bucket/token/billing was created and uploads are unconfigured; future file cleanup must be integrated before activation.
8. Users can see fetched question text and the public calculator provider in developer tools. A public GitHub repository exposes source architecture. Secret keys remain server-side; opaque IDs, ownership checks and limits reduce scraping but cannot make delivered content impossible to copy.

## Browser checklist

- Login/signup validation, provider success/failure, expiration, logout and session loss.
- Survey/self-assessment, skipped/resumed diagnostics, stale questions and completion.
- Representative MCQ, numeric, passage, table, diagram and math questions; submission/retry/review/bookmark/report.
- Practice sets, similar questions, ten-item paging, filtering, empty pools and reload summaries.
- Mini/custom/module/section/full tests; flags, saving, two tabs, timer expiry, sleep, offline/reconnect, abandonment, resume and results.
- Calculator beyond 15 seconds, graph input, fullscreen, Escape, hide/reopen, question and lesson changes.
- Settings/scores/dates/reminders/feedback; explicit disposable-account deletion.
- Every student route at 320/375/390 px, 200% zoom, long content, keyboard only, light/dark themes and screen reader.

The companion issue inventory records all 50 identified findings and normal error conditions. Historical descriptions are preserved as a baseline; current repair statuses take precedence.

## Dependency audit

The dependency audit reports 13 development-tooling advisories (9 high, 4 moderate), involving the braces/glob chain used by lint/scaffolding and the older esbuild chain in Drizzle tooling. No patched braces release was available in the registry at this check. Automatic force-fix recommendations downgrade major tooling and were not applied. The shadcn scaffolding CLI belongs in development dependencies and has been moved there. Do not expose development or Drizzle studio servers publicly. Recheck upstream patches; ordinary application tests cannot certify dependency vulnerability absence.
