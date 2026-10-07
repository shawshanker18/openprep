# Question pools: study vs test

Every question has a `pool` (`study` or `test`). The two are disjoint, so practising never uses up fresh test questions.

| Pool | Count (active) | Used by |
|---|---|---|
| `study` | 8,000 | Adaptive Practice, the question bank, saved practice sessions, skill drills (mini, weakness and custom tests) |
| `test` | 5,486 | Full tests, section tests, single modules, and the diagnostic |

Rules (all in `src/server/question-availability.ts`):

- Practice never serves a `test` question a student has not already answered. A `test` question they have answered
  (for example one they missed in a mock) can still come back as a review.
- Mock tests only read the `test` pool. If the diagnostic runs out of test questions in a domain it falls back to the
  whole bank for that domain rather than ending early.
- Retired questions are in neither pool's reach (`status = 'retired'`); their `pool` value does not matter.
- New questions default to `study`. To rebalance after an import, re-run the assignment in
  `drizzle/0019_question_pools.sql` (it is deterministic and stratified per skill and difficulty, and changing the
  `8000` target changes the split). Keep every skill and difficulty present in both pools.
