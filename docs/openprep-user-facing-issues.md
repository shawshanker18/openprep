> **Repair update, 4 October 2026:** The following descriptions are the original audit baseline, not the current state. Active bank now has 13,486 questions and zero rendering/format failures or dangling asset references. Most source defects have been repaired; Q08 (missing source explanations) and signed-in visual checks remain open; U08 now has input and set-summary recovery in source. See `openprep-repair-status.md` and the updated CSV for current evidence and limits.

# OpenPrep: user-facing issue inventory

Reviewed 4 October 2026. Project: OpenPrep. Live site: https://openprep-opal.vercel.app.

## Audit status

This is the consolidated list of known question, interface, recovery, accessibility, and account issues, plus the normal error conditions users can encounter. It is **not a completed live visual sign-off**: the browser permission control denied access during this pass, and the signed-in test account was not available to inspect. I continued with source review, prior public-page observations, existing tests, and fresh read-only database checks.

**Evidence labels:**

- **DB:** confirmed from the stored question bank. The type, choices, answers, passages, and explanations counts below were rechecked during this pass.
- **Source:** the implementation contains the described failure or limitation. The triggering condition is specified; its appearance on the deployed website has not been reproduced in this pass.
- **Risk:** a concern requiring a browser/device check before calling it a confirmed visual defect.
- **Condition:** an expected rejection, empty state, or service failure rather than automatically a bug.

Local source contains changes not yet deployed to Vercel. Findings about local source must not be assumed to describe exactly the current deployed interface. Earlier public-page checks found no captured console errors; that does not establish that student journeys work.

## A. Question content and answering

| ID | Priority / evidence | What users face and how to encounter it | Required repair |
| --- | --- | --- | --- |
| Q01 | Critical · DB + source | All **13,488 active questions** use `multiple_choice`, while `QuestionView` recognizes `mcq`. Open an imported question: the renderer takes the numeric-input branch rather than presenting choice buttons. | Restore the correct `mcq`/`spr` classification from source. |
| Q02 | Critical · DB | All **13,488 active choices** are JSON strings rather than choice-object arrays. Changing only the response type to `mcq` would expose an array-method failure; it is not a complete repair. | Normalize choices to `{id, md}` arrays and validate rendering. |
| Q03 | Critical · DB + prior reproduction | All **13,488 active answers** are strings. Submit a nonempty imported answer: the grader's object-membership check throws. Actual grader errors were reproduced earlier with `B` and `11`. | Normalize multiple-choice and numeric accepted-answer objects. |
| Q04 | Critical · DB + source | All **8,599 active Reading and Writing questions** have no passage field. Many stems contain only an instruction referring to absent text; students cannot determine an answer. | Restore passages and source context, including tables. |
| Q05 | Critical · source + earlier DB audit | Imported domains use `math`/`reading-writing` instead of the application's eight domain codes. `recordAttempt` selects skill-state rows from `skillsIn(q.domain)`; mismatched domains leave no matching state and can throw even when a response is skipped. Test selection also loses its intended domain balance. | Restore domain mappings before grading/diagnostic validation. |
| Q06 | High · earlier asset audit | **712 active questions** have asset references resolving to no asset records. A diagram-dependent question lacks its required diagram even though archive image bytes were stored. | Reconcile references with the correct stored assets. |
| Q07 | High · source + earlier DB audit | At least **643 active stems** contain `asset://` links. Markdown has no imported-asset resolver; these are not browser-accessible image URLs. Even correctly linked assets need a serving path. | Add an authorized asset resolver and verify each image-bearing question. |
| Q08 | High · DB | All **13,488 active explanations** are empty. Answer review cannot provide the expected worked explanation. | Restore explanations and review answer rationales. |
| Q09 | High · earlier DB audit | Only **21 of 29 skill IDs** have active questions. Selecting an uncovered skill produces an empty practice/test experience. | Reconcile source categories; supply content or visibly disable unavailable skills. |
| Q10 | Medium · earlier DB audit | **12,508 active stems** contain literal backslash-n sequences; **2,774** contain doubled backslashes. Paragraphs or mathematics can display as raw escapes. | Normalize text carefully and check mathematical rendering. |
| Q11 | High · earlier DB audit | **1,381 active rows** have one decoded choice and a non-letter answer but are labelled multiple choice. These appear to include numeric-response questions, so controls and accepted formats can be wrong. | Restore response format from authoritative source records. |
| Q12 | Medium · source archive review | Structured tables in choices require actual Markdown/table conversion. Coercing an object to a string can expose unreadable object text or omit needed data. | Convert structured choices and visually verify them. |

Related uncertainty: exact stored-content comparisons identified 64 active excess duplicate rows, but missing passages make editorial deduplication unsafe. Students may see repeated-looking questions; source reconciliation must establish whether they are true duplicates first.

## B. Interface and recovery defects identified in source

| ID | Priority | Trigger and user impact | Evidence / repair |
| --- | --- | --- | --- |
| U01 | High | Use the calculator for 15 seconds. Its timeout sets the state to `error` even if the applet already became ready, replacing the working calculator with the fallback iframe. | `src/components/desmos-panel.tsx`: timeout is cleared only during effect cleanup, not on successful applet load. Clear it on success. |
| U02 | High | Open the calculator without explicit expressions, then change component state such as fullscreen. The default `expressions = []` creates a new array on each render, retriggering the initialization effect and potentially losing entered graph work. | Same component, `[expressions, id]` dependency. Use a stable empty array and preserve the applet across presentation changes. |
| U03 | Medium | Repeatedly mount/unmount calculators or navigate between lessons. Created `ResizeObserver` instances are never disconnected, retaining callbacks to old applets. | Same component's effect cleanup. Disconnect observers and dispose of the applet. |
| U04 | High | Submit a practice answer while the server/network rejects the action. `submitAnswer` is awaited without a catch, so the intended recoverable error toast is bypassed by a rejected promise. | `src/app/(app)/practice/practice-runner.tsx`, `submit`. Keep the answer and display a retryable failure. |
| U05 | High | Submit or skip a diagnostic question during a rejected server action. The diagnostic also awaits without a catch. | `src/app/test/[sessionId]/diagnostic-runner.tsx`, `submit`. Preserve input and provide explicit retry. |
| U06 | High | Press Start on a test module while `startModule` throws. `starting` is set true first and is reset only for a returned false; a thrown error can leave Start disabled. | `src/app/test/[sessionId]/test-runner.tsx`, intro Start handler. Catch failures and reset state in `finally`. |
| U07 | High | Answer while offline or during a failed save, then reload/close the tab. The unsaved answer queue exists only in a ref/map, so it disappears; pending answers are not durably stored locally. | Same runner, `unsaved`. Add a safe per-user/session recovery queue and warning before navigation, or make the saving limitation explicit. |
| U08 | Medium | Reload a practice set. Its question list, chosen input, counters, and summary totals are held only in React state. The in-progress set is restarted rather than resumed. | Practice runner's reducer/state. Persist a session or explicitly warn before leaving. |
| U09 | Medium | Press answer shortcuts while a practice submission is pending. The keyboard listener lacks a `pending` guard, although clickable controls are disabled. The selected answer can change after the submitted snapshot was captured. | Practice runner's keyboard effect. Disable all input consistently during submission. |
| U10 | High | Press answer/flag shortcuts while a test submission is flushing answers. The keyboard handler does not check `submitting`; it can add another unsaved change after the submit snapshot. | Test runner's keyboard effect. Block editing during finalization. |
| U11 | Medium | Submit a test directly from the current question without navigating away. `submit()` calls `saveAll()` without first accruing the current question's final elapsed time. | Test runner's `accrue`, `go`, and `submit`. Accrue and flush current-item timing before submission. |
| U12 | High | Diagnostic submission returns an already-answered error and calls `router.refresh()`. The refreshed current-question prop does not reset `useState(initial)`, and the diagnostic component has no changing key. It can keep showing stale question state. | Diagnostic runner + `src/app/test/[sessionId]/page.tsx`. Synchronize to server state or remount at the current-question boundary. |
| U13 | Medium | The tutor receives a 401/403/429/503 response with a text body. It checks only for a body, not `res.ok`, and displays error text as an assistant answer. | `src/components/tutor-panel.tsx`. Separate service errors from streamed replies. |
| U14 | Medium | The tutor capability request temporarily fails. Its failure is memoized as false for the page lifecycle, so the tutor stays hidden without a retry mechanism. | Same component, `enabledCheck`. Allow retry and communicate temporary unavailability. |
| U15 | Medium | Turn reminders off while the server action rejects. `disable()` has `finally` but no catch/toast; the user gets no clear failure explanation. | `src/app/(app)/settings/reminders.tsx`. Show failure and retain accurate device state. |
| U16 | Medium | Send a test notification when `testPush()` returns `{ok:false}` or rejects. Returned failures are ignored, and rejections have no catch. | Same component, `test()`. Display failure details and retry guidance. |
| U17 | Medium | Sign-in's OTP call throws rather than returning an error object. The email form lacks a surrounding catch/finally and can remain on Sending. Failures preparing the signup ticket are silently swallowed. | `src/app/login/login-form.tsx`, `magic`. Recover the state and distinguish rate, delivery, and network failures. |
| U18 | Medium | Self-assessment or survey submission throws. The source handles returned error objects but lacks rejected-promise recovery in these submission flows. | Onboarding client forms. Preserve entered answers, end pending state, and show a retryable error. |
| U19 | Medium | Open lessons where browser storage is blocked or unavailable. Unguarded `localStorage.getItem`/`setItem` calls can throw instead of falling back to the default calculator layout. | `src/components/lesson-workspace.tsx`. Guard storage operations. |
| U20 | Medium | A user hits the custom app error screen after an unsaved mutation failed. It says “Your progress is saved” without checking whether that mutation succeeded. | `src/app/(app)/error.tsx`. Avoid unconditional assurances about unsaved changes. |
| U21 | High · conditional | An imported question becomes answered/bookmarked after the grader is repaired. The saved-question page also performs `"choice" in r.answer` and will fail on the still-string answer format. | `src/app/(app)/bookmarks/page.tsx`. Normalize the whole contract; do not fix only the grader. |
| U22 | Medium | Accumulate many saved questions. The page loads/render all bookmarks and complete preview content with no pagination. | Same page. Add bounded reads and navigation. |
| U23 | Medium | Use keyboard/screen-reader navigation in custom answer and self-assessment radio groups. Each radio is a button with no radio-group arrow-key navigation or roving tab behavior. The question group also has no accessible group name. | `question-view.tsx`, `onboarding/self-assessment.tsx`. Use a complete accessible radio implementation. |
| U24 | Low | End a web test. The confirmation says “Lockdown ends with it,” although native app development is shelved and an ordinary website cannot provide that app lockdown. | Test `lockdown.tsx`, `EndTest`. Make wording match the user's actual environment. |

These are findings from code, not claims that all 24 were visually reproduced in the deployed website.

## C. UI risks needing visual/device reproduction

| ID | Area and scenario | What to verify |
| --- | --- | --- |
| V01 | Calculator fullscreen | Keyboard focus trap, Escape to exit, background scrolling, focus return, and interaction with a modal/sheet. The implementation is a fixed container rather than an accessible dialog. |
| V02 | Calculator fallback | Whether the GeoGebra iframe is blocked by network/CSP restrictions; whether typed expressions survive; whether the external-link fallback is usable. |
| V03 | Test focus-loss warnings | Clicking into the embedded calculator or triggering browser UI may fire `window.blur` and produce a warning despite legitimate test use. Reproduce before changing focus tracking. |
| V04 | Required custom dates | Clear a required date and submit; verify the browser can focus the visually hidden required input and show a usable error on the visible trigger. |
| V05 | Calendar keyboard boundaries | Arrow navigation at min/max dates can move its focus state to a disabled date. Verify focus recovery, month changes, screen-reader announcements, and keyboard-only completion. |
| V06 | Narrow screens | Check 320/375/390-pixel layouts: self-rating buttons, question choices/tables, test header, calculator's 280-pixel minimum, bottom navigation, lesson title truncation. No mobile visual sign-off was possible. |
| V07 | Zoom and long content | Check 200% zoom, very long choices, large equations, embedded tables, and long translated names for clipping or unreadable overflow. |
| V08 | Notifications dropdown | The fixed panel has no explicit height cap/scroll region or scroll-based repositioning. Check a short viewport, long notifications, and scrolling after opening. |
| V09 | Saved-question workflow | The visible action is Practice this skill, not directly resume this saved question. Decide whether users need a direct attempt action; do not label the existing correctly named button broken. |
| V10 | Loading and error announcements | Verify focus location and screen-reader announcements for practice loading, saves, toasts, question changes, diagnostics, and tutor streaming. |
| V11 | Contrast and interaction sizes | Measure text/state contrast in light/dark mode, flag/correct/incorrect states, and compact icon controls. No measured contrast/touch-target failure is asserted here. |
| V12 | Outside the signed-in app layout | Tests, login, onboarding, and top-level layout errors have no equivalent custom app-group error boundary. Verify what users actually see on each route's failure. |
| V13 | Network loss at timer expiry | Verify slow/hanging saves, expiration, automatic submission, reconnection, and whether answers arrive before the authoritative deadline. A paused or slept browser is also required. |
| V14 | Account deletion with future R2 records | The shelved R2 metadata FK restricts deletion while records exist, but account deletion does not clean those records. It currently contains no files. Do not enable uploads until deletion/cleanup is integrated. |

## D. Expected errors and other conditions users can encounter

These should have clear messages and a recovery path; their existence is not a defect by itself.

| Flow | Condition | What the user should be able to do |
| --- | --- | --- |
| Sign-in | Terms/age checkbox not selected | Understand why email/Google continuation is disabled. |
| Sign-in | Invalid address, email delivery failure, throttling, spam filtering | Correct the address, retry after a clear delay, or use the other configured provider. |
| Sign-in | Expired/already-used email link, wrong-device callback, invalid Google token/nonce | Request a fresh sign-in flow. |
| Signup | New-account/IP cap | Receive the actual refusal reason and understand when or where signup is permitted. |
| Session | Expired cookies, sign-out in another tab, lost authentication during an action | Sign in again without falsely claiming an unsaved answer was persisted. |
| Onboarding | Invalid settings/ratings, duplicate submission, no diagnostic pool | Preserve form inputs; resume the correct step or report missing content. |
| Diagnostic gate | Skip for now selected | Browse allowed pages; understand that practice/tests/plan remain locked until diagnostic completion. This restriction is disclosed. |
| Diagnostic | Stale/already-answered question or ended session | Resume the server's current question or open the result/dashboard. |
| Practice | Empty skill/tag pool, retired/unknown question, exhausted selected list | Change filters or complete the set with accurate counts. |
| Practice | Request throttling | Wait and retry; avoid losing the current input. |
| Practice | Duplicate answer, expired serve, active-test question | Understand why the answer/reveal is rejected. The generic Question not found may need better recovery guidance. |
| Bookmark/report | Network failure, invalid item, daily report limit | Retain the user's choice/report text and explain retry or next-day availability. |
| Tests | Existing full/section test, invalid configuration, empty selection, start-rate limit | Resume the open test, correct the request, change skills, or wait. |
| Tests | Saving failure, unknown item, closed module, deadline reached | Show accurate saving status and distinguish temporary connectivity from a final deadline rejection. |
| Tests | Concurrent tabs, double submit, background/sleep, reload after deadline | Keep server-authoritative results and avoid duplicates; validate through the browser. |
| Historical app tests | Native-locked session opened in a normal browser | Explain recovery for legacy sessions even though native app development is shelved. |
| Tutor | Disabled model, expired session, denied access, provider failure, daily quota | Keep ordinary practice usable and show a separate tutor-service error. |
| Settings | Invalid score/date/profile, more than 20 scores, diagnostic retake within 30 days, wrong deletion confirmation | Explain the exact field/rule and preserve other form inputs. |
| Reminders | Unsupported browser, missing configuration, denied permission, iOS installation requirement, expired subscription | Show the accurate reason; let the user retry or disable reminders. |
| Feedback/security forms | Invalid input, daily/rate cap, network/server error | Keep draft text, show a clear error, and allow later submission. |
| Lists/charts | No bookmarks/mistakes/history/activity, restrictive filters | Show an accurate empty state with useful next actions. |
| General navigation | Unknown route, deleted item, unauthorized admin page | Offer a safe navigation path. Unauthorized admin not-found is intentional. |
| General services | Supabase/hosting outage or slow response | Provide recovery guidance; avoid infinite pending buttons and promises that work was saved. |
| Shelved private upload API | Storage unconfigured, invalid type, over 3 MB, quota, inaccessible file | No upload UI is currently added; the API is intentionally unavailable pending setup. Do not advertise it as working. |

## E. Remaining browser checklist

1. Sign in with a disposable account; test email/Google success, expiry, validation, and logout.
2. Complete survey/self-assessment; skip and then resume the diagnostic; test stale-question recovery.
3. Attempt representative MCQ, numeric, passage, image, table, and math-format questions after import repairs.
4. Check answer submission, confidence, wrong-answer review, explanations, mistake labels, bookmarks, and reports.
5. Reload/close during an unsaved practice/test answer; reconnect; verify state and exact result counts.
6. Run mini/custom/module/section/full tests, flagged-question review, timed expiry, two tabs, abandon, reload/resume, and results.
7. Keep the calculator open beyond 15 seconds; type a graph; resize, fullscreen, hide/reopen, and change question/lesson.
8. Check every student route, filters, pagination, long lists, charts, empty states, and older links/redirects.
9. Check settings, official scores, reminders, feedback, and account deletion in an explicitly disposable workflow.
10. Repeat with keyboard only, a screen reader, light/dark themes, narrow desktop-browser viewports, zoom, and long content.

Mobile and desktop application builds remain shelved. Responsive website checks still apply.

## F. Coverage and supporting inventories

- **38 page routes** are inventoried in `OpenPrep-UI-route-coverage.json`. Inventory is not evidence that each route was visually exercised.
- **68 explicit source error/condition occurrences** are catalogued with file and line in `OpenPrep-error-message-inventory.csv`. This extraction covers literal returned errors, toast errors/warnings, thrown errors, and text API errors. It does not claim to include every dynamically constructed or third-party message.
- Detailed source review in this pass covered the question renderer, practice and test runners, diagnostic runner/page, calculator, tutor, login, onboarding, reminders/settings, bookmarks, notification dropdown, date input, lesson workspace, error boundaries, and the related server actions.
- Earlier live public coverage: home, about, privacy, terms, feedback, security, login; signed-out routing checks for the main student pages. Those observations are preserved in the earlier audit checklist.
- Existing test/build results validate selected program behavior, not visual layout, all imported content, or every signed-in journey.

## Repair order

1. Restore question contracts, passages, domain mappings, and image linking/serving. These currently block meaningful practice and diagnostics.
2. Fix calculator initialization/timeout and submission recovery.
3. Make unsaved state and reload/expiry behavior reliable; remove misleading saved-progress assurances.
4. Improve tutor/notification errors and radio/date accessibility.
5. Complete the signed-in responsive and visual checks once browser access is allowed.

No UI fixes were applied in this reporting pass. The inventory is complete for the evidence reviewed; the live signed-in visual audit remains explicitly pending.
