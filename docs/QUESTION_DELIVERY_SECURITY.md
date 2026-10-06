# Question delivery security

Implemented on the draft branch, 5 October 2026. Applying the migration and deploying the app are required before these changes protect production.

## What the browser can see

The bank generates practice sets. It does not return the unseen catalogue, bank totals, numbered pages, stable ordering, or question-to-skill/difficulty rows. Skill names and selected practice settings remain visible because they are learning controls, not a map of stored questions. Personal saved questions and mistakes remain available after authorised delivery.

Each public question ID is a 22-character HMAC of the verified account ID and internal question ID. This implements the requested minimum of account-specific identifiers; these are not random per-delivery handles. They remain stable within an account. Resolution examines only that account's delivered/answered questions, never a global ID map. Another account's question ID, raw database ID, or invented bookmark cannot grant access.

Question server actions verify login independently of page/layout gating. Supabase anonymous users are rejected. Initial payloads contain only the public ID, passage, stem, choices and personal copy reference. Answers and explanations appear after an accepted answer, or after the completed test. Internal question IDs, asset UUIDs, skill labels, difficulty, tags and source indexing are not included in the initial question payload.

The current live database was checked read-only: questions, attempts, question_serves and test_items have RLS enabled, and neither anon nor authenticated has SELECT privileges. Migration 0013 reinforces this for questions and denies browser access to all new ledgers. The server database role still needs application ownership checks; RLS does not isolate its privileged queries automatically.

## Atomic delivery

Postgres is the authority, including when Redis is missing or fails. A transaction locks guard rows for the account, signed browser device and trusted network in a fixed order. It checks rolling exposure windows, writes the first-exposure ledger, consumes the practice paper allowance, and records delivery before returning content. A failure rolls back delivery and exposure. Redis Lua is not required for correctness.

Every fresh question in practice, test modules, test starts and diagnostic responses uses this ledger. Test results also pass it, closing a result-page bypass. Existing delivered/answered content is backfilled by the migration. Reopening the same exposed question does not charge another new-question allowance.

| Scope | New questions in rolling 24 hours | New questions in rolling 7 days |
| --- | ---: | ---: |
| Account | 180 | 600 |
| Skill within an account | 60 | 180 |
| Signed browser device across accounts | 360 | 1,200 |
| Trusted IP across accounts | 1,800 | 6,000 |

The limits live in src/server/delivery-policy.ts. Shared-network limits are higher to accommodate families and schools; monitor and tune these values from actual student use.

Additional controls:

- Practice: at most 12 deliveries per rolling minute. Unanswered questions and unfinished sessions do not block new practice. Resume preserves the original clock and consumes no new exposure.
- A practice/diagnostic answer needs five seconds of server-measured elapsed time. Supplying a larger client time does not satisfy this requirement. Wrong or blank answers still reveal explanations after acceptance, for learning.
- Test creation is atomically capped at four starts per account, eight per device and forty per IP in five minutes; concurrent requests cannot create extra sessions.
- Test modules cannot be submitted until at least five seconds per item have elapsed since starting. Normal SAT deadlines and server-side expiry still apply. Starting and viewing modules charge exposure; tests cannot bypass daily/weekly allowances.
- Practice requests: 10 per rolling 10 seconds per account; 20 per device and 100 per IP. Answers also have a three-per-question-per-minute bucket. Rejected answers still count as requests. These database limits are identical during Redis outages.
- Paper tokens have an encrypted random nonce, an account binding and a two-hour expiry. Creation is capped at 60 per day per account, with shared device/IP caps. Each actual practice delivery consumes the token's server-side question allowance. Client exclusions or counters cannot reset it.
- Similar-question requests require an answered question, have a 30-per-day account quota plus shared quotas, and randomly sample a broader skill pool. They do not return neighbor lists or similarity scores.
- Image access and refresh require verified login and prior delivery. URLs encrypt question and asset identifiers, use random IVs and expire after ten minutes. They cannot be shared across accounts. Authenticated refresh keeps long tests working without a permanent public image URL. Image requests/renewals have account/device/IP rate limits and no shared-cache response.
- Signed-out writes use a database-backed 30-per-minute network limiter even without Redis. Signup tickets are atomically capped at 30 per IP per hour and six per signed device per day. The existing Supabase before-user-created hook remains responsible for the three-new-accounts-per-network-per-day cap.

## Monitoring and retirement

/admin/exposure requires an admin on the page and on the retirement action. It shows question exposure, multiple accounts sharing devices/networks, and an audited retirement form. Shared IPs alone are not proof of abuse. Retirement prevents new delivery, including questions selected earlier for an unviewed test. Historical copies already legitimately seen cannot be withdrawn from users' computers.

Questions display a personal copy reference. Given the question ID and reference, the private findCopyOwner helper can find the exposed account. This is a weak screenshot/provenance aid, not a forensic guarantee: it is easy to remove, and unchanged question text still matches across accounts. We preserve academic content and SAT answer labels; automatic numerical/text variants would require independently validated answers and teacher review.

The authenticated cron tick deletes expired rate buckets/guards and strips exposure IP/device hashes older than 30 days. It retains first-exposure history, so old questions are not accidentally counted as new again. IPs and browser identifiers in the ledger are keyed hashes, not raw values.

External leak searches are not automated in this change. An operator should periodically review high-exposure questions, search distinctive excerpts on the public web, verify actual matches, record the evidence, retire confirmed leaked items, and publish reviewed replacements through the content process. A search-provider integration/scheduled job must be configured before claiming continuous web monitoring.

## Deployment and practical limits

1. Apply migration 0013 with the existing Drizzle migration workflow before serving the new app. It creates private ledgers, grants only the server app role, and backfills genuinely delivered content. A database failure denies new question access.
2. Keep a strong QUESTION_ID_SECRET server-side. CRON_SECRET is the supported fallback; neither belongs in NEXT_PUBLIC variables. Rotating it invalidates existing question references, image links and paper tokens, so plan rotation with a refresh and preserve old tracing keys if historical attribution is needed.
3. Vercel uses x-vercel-forwarded-for. For self-hosting, set OPENPREP_TRUSTED_IP_HEADER only to a header that the controlled proxy strips and rewrites, and block direct access to the origin. Missing trusted IP or signed device in production denies question access. Never trust arbitrary browser forwarding headers.
4. The proxy creates the signed HttpOnly, Secure production device cookie. It is a browser identifier, not a hardware fingerprint: clearing cookies creates another device bucket. Account and IP quotas continue to apply.
5. Verify the before-user-created hook and cron are enabled in the deployed Supabase project; source files alone do not enable hosted Auth hooks or schedules. Grant an admin through the existing backend admin command before using exposure management.
6. Refresh old browser drafts and links after deployment. Account-scoped IDs deliberately invalidate the old globally shared IDs.

Login and quota checks constrain access and collection volume. They cannot prevent copying content legitimately displayed on screen, coordinated use of different networks/accounts, screenshots without references, or gradual collection over many weeks.

## Verification

Tests use real SQL in PGlite for concurrent-call quota boundaries, daily/weekly and shared-device/IP caps, rolling request windows, the additional answer bucket, unanswered limits, minimum answer time, immutable resume clocks, paper replay, cross-account IDs, forged bookmarks, retired content, browser-role denial and cleanup. API tests verify unauthenticated and cross-account image rejection; token tests cover expiry and tampering. Existing onboarding and test lifecycle coverage remains enabled.

PGlite executes through an in-process connection; its parallel-call tests exercise atomic transaction logic, but do not substitute for multi-connection production load testing. Signed-in browser, mobile layout, proxy headers, device cookie propagation and deployed database/hook/cron checks remain deployment validation work.

Reference documentation: [Next.js Server Actions](https://nextjs.org/docs/app/guides/server-actions), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vercel request headers](https://vercel.com/docs/headers/request-headers).

The live Supabase security advisor also reports [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). This existing Auth setting was not changed. Its RLS-without-policies informational notices are expected for server-only tables with revoked browser grants.
