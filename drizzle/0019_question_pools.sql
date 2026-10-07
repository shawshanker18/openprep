ALTER TABLE "questions" ADD COLUMN "pool" text DEFAULT 'study' NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_pool_check" CHECK ("questions"."pool" in ('study', 'test'));--> statement-breakpoint
-- Deterministic, stratified split of the active bank: exactly 8000 study questions (largest-remainder quota per
-- skill x difficulty, so every group keeps both pools), the rest reserved for tests. Questions students already
-- practised stay in study; ones they met in tests stay in test. Re-running gives the same split.
WITH cells AS (
  SELECT skill_id, difficulty, count(*)::numeric AS n FROM questions WHERE status = 'active' GROUP BY 1, 2
), exact AS (
  SELECT skill_id, difficulty, n, n * 8000 / NULLIF(sum(n) OVER (), 0) AS q FROM cells
), floors AS (
  SELECT skill_id, difficulty, n, floor(q) AS f, q - floor(q) AS frac FROM exact
), ranked AS (
  SELECT skill_id, difficulty, n, f, row_number() OVER (ORDER BY frac DESC, skill_id, difficulty) AS rk, 8000 - sum(f) OVER () AS extra FROM floors
), quota AS (
  SELECT skill_id, difficulty, LEAST(n, f + CASE WHEN rk <= extra THEN 1 ELSE 0 END) AS study_n FROM ranked
), seen AS (
  SELECT question_id, bool_or(context IN ('practice', 'review')) AS in_practice, bool_or(context IN ('test', 'diagnostic')) AS in_test FROM attempts GROUP BY question_id
), ordered AS (
  SELECT q.id, qu.study_n,
    row_number() OVER (PARTITION BY q.skill_id, q.difficulty ORDER BY
      CASE WHEN s.in_practice AND NOT s.in_test THEN 0 WHEN s.in_test AND NOT s.in_practice THEN 2 ELSE 1 END, md5(q.id)) AS rn
  FROM questions q
  JOIN quota qu ON qu.skill_id = q.skill_id AND qu.difficulty = q.difficulty
  LEFT JOIN seen s ON s.question_id = q.id
  WHERE q.status = 'active'
)
UPDATE questions q SET pool = CASE WHEN o.rn <= o.study_n THEN 'study' ELSE 'test' END FROM ordered o WHERE o.id = q.id;
