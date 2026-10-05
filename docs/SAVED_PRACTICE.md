# Saved practice sessions

Practice now creates an account-owned database session and redirects to `/practice?session=<random UUID>`. Reloading that URL resumes the same session instead of creating another paper. `/practice/sessions` lists saved sessions, including completed ones, with older-page navigation. The dashboard resumes the latest unfinished session.

## Stored state

- Server-owned selection configuration, title, return destination and creation/update times.
- Current question position and active/completed status.
- Each reached question's position, internal ID, delivery time, unfinished response and saved working time.
- The accepted attempt ID. Answers, correctness, explanations and summary totals are rebuilt from that attempt, rather than trusting browser totals.

Future questions are selected on demand; the client receives no future question IDs or text. The remaining set size is a requested session size, not the size of the question bank. Practice sessions use the existing generated-set creation quotas and a maximum of 100 reached questions per session (custom sets remain 5–50). Resuming has no two-hour paper-token expiry and does not restart that cumulative count.

Drafts save after a short pause in input and periodically while the tab is visible. A local input-only backup covers unsynced work on the same device. "Save and leave" waits for the server save; failed saves are shown explicitly. Sudden closure while offline cannot promise cross-device sync, and periodic timing checkpoints can lose the final few seconds. Previously expired browser-only session history is not reconstructed.

"Skip for now" preserves an unattempted item; numbered buttons return to previously reached questions. Skipping does not bypass the two-outstanding-question limit. A blocked new pull leaves the saved cursor unchanged, so reloading returns to the open question. Submitted answers remain immutable. Completed sessions can be reviewed without being turned into unfinished sessions.

## Security and consistency

- Every action verifies the signed-in user, validates a strict bounded input schema and checks session ownership.
- Both new tables have RLS enabled and public client-role grants revoked. Only the authenticated server paths can access them.
- Account/device/IP guard locks and the owned session row serialize deliveries and navigation. Duplicate Next requests advance once.
- New exposure and unanswered quotas remain enforced. Restoring the same unanswered delivery preserves its server clock and does not charge another exposure.
- Question delivery and its session item commit together. Accepted attempts and their session item commit together, including lost-response retries.
- Only a reached, accepted attempt may reveal an explanation; unfinished drafts cannot mark questions correct, alter totals or assign attempt IDs.
- If another session supersedes the delivery, restoration must re-establish it through the normal delivery quotas.
- Live-test questions stay blocked from practice and explanations.

## Uploads and malformed requests

The repository includes a private R2 image/PDF API (`/api/files`) with metadata and quotas in Postgres. No student-facing upload screen currently calls it. Practice-session saving does not use file uploads.

The upload API requires a verified, non-anonymous account and same-origin writes. It accepts PNG, JPEG, WebP, GIF and PDF, rejects other MIME types before buffering, caps actual streamed bytes at 3 MiB, checks file signatures, reserves storage quota before upload and uses random object keys. Owned downloads are proxied with no-store/nosniff headers; PDFs download as attachments. Another account cannot read/list/delete the file.

Signature checking is not full file decoding or antivirus scanning. A file with a permitted header can still contain malformed or malicious data. There is no antivirus/content-disarm pipeline configured; do not describe uploads as guaranteed malware-free.

Raw JSON requests for the AI tutor and image renewal are bounded while streaming (128 KiB and 16 KiB respectively), with invalid UTF-8/JSON, wrong content types and unknown fields rejected. The AI endpoint also enforces same-origin writes and the shared request limiter. Server Actions retain the framework's default body-size/origin protection, plus application validation and ownership checks.

## Rollout and verification

Apply Drizzle migration 0014 (after the pending 0013) and deploy the application. This change has not been applied to the hosted database. Automated database tests cover saved draft/result restoration, a seven-day pause, skips/jumps, duplicate pulls, atomic progress, quotas, cross-account access and completed review. File and request-body tests cover unsupported types, disguised files, streamed oversize requests, invalid JSON/encoding and anonymous account rejection. Signed-in production UI and R2 provider checks remain unverified.

## Graphing calculator first-load sizing

The GeoGebra wrapper previously initialized a fixed 900 × 500 applet, then resized synchronously during its load callback. It now measures the actual flex host before injection, waits for a visible host, and applies a post-load size after two animation frames. It observes the host rather than the outer border/padding, refreshes on fullscreen/minimize, and cancels pending frame callbacks on cleanup. Failed script loads can be retried by a later mount. Tests cover first-open dimensions, hidden/reopened panels, fullscreen sizes and cleanup. This is a code-level fix; the hosted GeoGebra canvas has not been visually tested in a signed-in browser.
