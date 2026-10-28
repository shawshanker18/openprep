# Paid plans, payments and AI remix

Last updated 28 October 2026. This covers the Plus and Pro plans, how payment works with PayPal, the AI question
remixer, and the plan-ending reminders. Keys and secrets are never written here; only their names.

## 1. Plans

| | Free | Plus | Pro |
|---|---|---|---|
| Question bank, Smart Practice, lessons | yes | yes | yes |
| Practice tests | first 6 | all 20 | all 20 |
| AI question remix | no | 50 fresh remixes a month | unlimited, with abuse limits |
| Upgraded question bank | no | yes (contents not set up yet) | yes (contents not set up yet) |

Only four practice papers exist so far, so the 6 versus 20 limit does nothing yet. The upgraded question bank has no
content; the owner decides what goes in it. Limits live in `src/lib/tiers.ts`.

## 2. How paying works

Nothing renews by itself. Each payment is a one-time PayPal payment that buys days of Plus or Pro. When the paid time
ends the student goes back to Free unless they buy again.

Options on `/pricing` (Upgrade at the bottom of the sidebar):

| Option | Days | Plus | Pro |
|---|---|---|---|
| 30 days | 30 | $7 | $15 |
| 3 months | 90 | $15 | $32 |
| Until an SAT exam | through the day after the exam | about 10% under buying the same months outright | same rule |

- The 3-month price is $5 a month for Plus (the owner's 7 to 5 ratio). Pro keeps the same ratio, rounded to a dollar.
- The shared duration selector lists monthly, quarterly, and the next two official SAT dates (`src/lib/sat-dates.ts`). The plan ends the day after the exam.
  The price is the cheapest mix of 30-day and 3-month packs for those days, times 0.9 (`EXAM_RATE`), rounded to the
  nearest 50 cents, never under $2 (`MIN_CENTS`). **Add new SAT dates to `sat-dates.ts` as they are announced, or
  the exam options run out.**
- All prices and the rounding rules are in `src/lib/membership.ts`. The server works the price out when the payment
  starts; the browser only says which option it wants.

### Upgrades and renewals (the queue)

A student's paid time is a short list of dated blocks. The higher tier always runs first, then the lower one.

- Buying **Pro** while on Plus gives a fresh Pro period starting now. The leftover Plus days resume afterwards.
  Example: Plus with 12 days left, buy 30 days of Pro, get Pro for 30 days and then Plus for 12.
- Buying **more of the same plan** adds days to that plan.
- The student's plan at any moment is whichever block covers the current time.

### What happens on a purchase

1. The student sees their current plan separately from the two paid options (no Free purchase card). One duration
   selector updates both plan prices from the server quote function. Selecting a paid plan reveals an integrated
   checkout with the total, duration and PayPal’s card/PayPal buttons. The card
   button opens a small PayPal window where the student can pay as a guest, with no PayPal login.
2. `startPayment` (server action, `src/app/(app)/pricing/actions.ts`) prices the order and creates it at PayPal. A row
   goes into `membership_purchases` with status `created`.
3. The student approves. `capturePayment` captures the payment at PayPal and checks it is `COMPLETED` for exactly the
   expected amount. Only then are the days granted (`src/server/membership.ts`), once, in a locked transaction.
4. The student lands on `/pricing/success?order=<order-id>`. The page checks that the order belongs to the signed-in
   student and reads its status from the database. Completed purchases show an animated congratulations screen for
   the purchased tier (with reduced-motion support). Pending payments show a status-check button, which retries that
   order; refunded orders never show congratulations. Settings can also reconcile unfinished payments as before.
5. The webhook (`/api/paypal/webhook`) is the safety net. It grants days if the student closed the tab after paying,
   and takes days back on a full refund, a chargeback, or a denied capture. Partial refunds leave the days alone.

### Data

- `membership_purchases`: one row per PayPal order (tier, billing option, days, amount in cents, order id, status
  `created`, `completed` or `refunded`).
- `membership_blocks`: the dated blocks that decide the student's plan right now.
- `membership_reminders`: one row per student per end date, so the "ending soon" push is sent once.
- `paypal_events`: webhook deliveries already handled.
- `remix_usage` and `question_remixes`: see section 4.

Migrations: 0027 (first paid tables), 0028 (remix direction "numbers"), 0029 to 0031 (memberships, drop the old
subscriptions table, reminders). Where the code runs: the **Next.js app on Vercel** does all of this. Supabase only
stores the data.

## 3. PayPal setup

Settings and secrets go in **Vercel** (Project, Settings, Environment Variables, Production), then redeploy. The
app reads them from its own environment; it cannot read Supabase's Vault.

| Variable | Notes |
|---|---|
| `PAYPAL_ENV` | `sandbox` or `live` |
| `PAYPAL_CLIENT_ID` | from the PayPal app (sandbox or live) |
| `PAYPAL_CLIENT_SECRET` | same app. Server only; never put it in a `NEXT_PUBLIC_` variable |
| `PAYPAL_WEBHOOK_ID` | the id of the webhook created below |
| `NEXT_PUBLIC_SITE_URL` | `https://openprep.site` |

No billing plans are needed. Create one webhook in the PayPal app at `https://openprep.site/api/paypal/webhook` with
the events `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`,
`PAYMENT.CAPTURE.REVERSED` and `PAYMENT.CAPTURE.DENIED`.

To test in the sandbox, use a sandbox **personal** account as the buyer (Developer dashboard, Testing Tools, Sandbox
Accounts), never a real PayPal account. To go live, create a Live app, set `PAYPAL_ENV=live`, new client id, secret and
webhook id, and redeploy.

### If something looks wrong

- **"Payments coming soon" on `/pricing`:** the running build cannot see `PAYPAL_CLIENT_ID` or `PAYPAL_CLIENT_SECRET`.
  Check the names, that Production is ticked, and redeploy.
- **"PayPal is still confirming" and the plan stays Free:** the capture or the webhook did not grant the days. Open
  `/settings?plan=processing` to re-check. Look at the Vercel log line "PayPal payment not granted" (it names the
  order status, capture status and amount) and at the webhook event log in PayPal. A 401 there means
  `PAYPAL_WEBHOOK_ID` is wrong.
- **Resetting a test buyer:** delete that account's rows in `membership_purchases`, `membership_blocks`,
  `membership_reminders` and `remix_usage` (the account itself stays).

## 4. AI question remix

Plus and Pro students can ask for an easier, same-level, harder, or numbers-only version of a question.

- **Model:** Mistral's API with GLM 5.3 Flash. Variables: `MISTRAL_API_KEY` and `REMIX_MODEL` (the model id from the
  Mistral console). Optional cap: `REMIX_GLOBAL_DAILY_CAP` (default 3000 fresh remixes per day across all students).
- **The model sees the real question** (passage, stem, choices, skill, difficulty) and is told to write a new one in
  the same style, in the direction asked. A second independent solve must reach the same answer or the draft is
  thrown away.
- **Saved for everyone:** a remix becomes a real row in `questions` (pool `remix`, id `rmx-` plus a hash) and is
  recorded in `question_remixes`. The next student who asks for the same remix gets it instantly and free. A remix of a
  remix is allowed.
- **"Swap the numbers"** keeps the wording and changes only the numbers and values. It is offered only on math
  questions with digits in the text.
- **Questions with a figure or diagram cannot be remixed at all**; the button is hidden.
- **Credits and limits:** Plus gets 50 fresh remixes a month (opening a saved remix is free). Pro is unlimited but
  limited to 15 an hour and 60 a day. Everyone is limited to 10 requests a minute. A failed generation is refunded.
- **Code:** `src/server/remix.ts` (credits, caching), `src/server/remix-model.ts` (prompt and checks),
  `src/lib/remix.ts` (directions and rules), `src/app/(app)/practice/remix-bar.tsx` (the buttons).

## 5. Plan-ending reminders

- The notification bell and the Settings plan section show "Your plan ends in N days" when 7 days or fewer remain.
- Students with push turned on get one notification when 3 days or fewer remain, sent by the five-minute cron job
  (`sendExpiryReminders` in `src/server/push.ts`). There is no email.

## 6. Question bank and practice changes made with the plans

- The question bank has a single **Practice** button that goes straight into the questions. "Question not found" was
  fixed by exposing questions before the session is created.
- Desmos is a floating, draggable, preloaded window, saved per session, that does not reset between questions.
- Right and wrong answers use monochrome styling, not green and red.
- The anti-bot cooldown between rapid skips was shortened from 8 seconds to 3 seconds.
- The next question is fetched 3 seconds after the current one loads, and the time spent on a question is capped by
  the server (`PREFETCH_AFTER_MS` and the answer-time cap in `src/server/practice-sessions.ts`), so timing cannot be
  faked from the browser.

## 7. Not done or not verified

- The PayPal flow has been built and its logic tested, but a full sandbox purchase has not been confirmed to work
  end to end. A first attempt was left unpaid because the capture check was too strict; that was loosened and the
  reason for any refusal is now logged. Re-test after each change.
- No on-page card form. PayPal's Advanced Card Payments would allow one, but it needs PayPal to approve the business
  account and may not be available in every country. The card button opens PayPal's small guest window instead.
- Live Mistral output (JSON compliance, quality) has not been checked with a real key.
- The upgraded question bank has no content; the landing FAQ, About and Terms pages still say "no subscription".
- The pricing and Settings screens have not been checked in a browser at all widths.
- No email reminders.
