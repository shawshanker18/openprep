# Responsive layout and backend verification — 6 October 2026

The dashboard uses bounded grid tracks, wrapping session titles, and an auto-height Resume button. The Next SAT card no longer creates an implicit second grid column on narrow screens. Progress bars and Question Bank choices also allow their text columns to shrink. Test and calculator workspaces use dynamic viewport heights, and the lesson calculator no longer has a fixed 600 px minimum. Mobile navigation and content account for safe-area insets; touch-device inputs use at least 16 px text to avoid iOS focus zoom.

The production dashboard view was rendered with synthetic student data locally. At 320×568, 390×844, 844×390, and 1280×900, document width equalled viewport width. Portrait and landscape checks found no main-content elements beyond the viewport. The 390 px Resume button was 64 px tall with 64 px scroll height, so its wrapped title was not clipped. Landscape was also checked with the desktop sidebar occupying its real 224 px width. This browser check is not a physical iPhone test.

Read-only EXPLAIN ANALYZE on the live Supabase database compared equivalent question eligibility queries for one Math skill and one account:

| Query | Execution time | Rows | Root plan |
| --- | ---: | ---: | --- |
| Correlated active-session exclusion | 90.283 ms | 185 | Nested Loop |
| Account-specific active question sets | 1.107 ms | 185 | Index Only Scan |

A bidirectional EXCEPT comparison returned zero differing question IDs. The new query builds active practice and test sets once. Question IDs in these sets are NOT NULL by schema, preserving NOT IN semantics. Ownership, current-session exceptions, reserved test questions, and exposure locks remain enforced. These measurements cover one query and are not an application-wide latency or traffic-capacity guarantee.

Answer recording now updates eligible sibling skill rows in one statement within the existing transaction and locks. Tests verify the same score bounds, established-skill exclusion, account isolation, and two skill UPDATE statements per answer rather than one per sibling.

Dashboard independent reads start together. Resume queries only the newest active session instead of fetching a page of history. The bounded five-connection PostgreSQL client is reused across route bundles in each process; prepared statements remain disabled for transaction-pooler compatibility. Slow-changing global reads already coalesce concurrent requests; a regression test covers 100 callers sharing one load and prevents an older failed refresh from clearing newer data. Student history and scores remain uncached across requests.

No live schema changes, student-data rewrites, or provider capacity changes were performed. Sustained production traffic capacity still depends on Vercel and Supabase plan limits and requires a separate controlled load test.
