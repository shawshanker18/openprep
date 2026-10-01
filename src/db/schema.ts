// Complete database schema (spec 01 §4). Text columns instead of enums; values validated by zod at the edge.
import {
  pgTable, uuid, text, integer, smallint, real, boolean, timestamp, date, jsonb, primaryKey, index,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });
const userRef = () => uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" });

/* ───────── users ───────── */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  createdAt: ts("created_at").notNull().defaultNow(),
  onboardingStep: text("onboarding_step").notNull().default("survey"), // survey | self | diagnostic | done
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  grade: smallint("grade"),
  curriculum: text("curriculum"),
  topicsStudied: jsonb("topics_studied").$type<string[]>().notNull().default([]),
  englishBackground: text("english_background"),
  priorMath: smallint("prior_math"),
  priorRw: smallint("prior_rw"),
  targetScore: smallint("target_score"),
  testDate: date("test_date"),
  minutesPerDay: smallint("minutes_per_day").notNull().default(45),
  daysPerWeek: smallint("days_per_week").notNull().default(5),
  weeklyFocus: jsonb("weekly_focus").$type<{ weekOf: string; skillIds: string[] } | null>(),
});

export const satAttempts = pgTable("sat_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userRef(),
  takenOn: date("taken_on").notNull(),
  math: smallint("math").notNull(),
  rw: smallint("rw").notNull(),
});

/* ───────── content ───────── */
export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  skillId: text("skill_id").notNull(),
  section: text("section").notNull(),
  domain: text("domain").notNull(),
  difficulty: smallint("difficulty").notNull(),
  type: text("type").notNull(), // mcq | spr
  passageMd: text("passage_md"),
  stemMd: text("stem_md").notNull(),
  choices: jsonb("choices").$type<{ id: string; md: string }[] | null>(),
  answer: jsonb("answer").$type<{ choice: string } | { accepted: string[] }>().notNull(),
  explanationMd: text("explanation_md").notNull(),
  choiceRationales: jsonb("choice_rationales").$type<Record<string, string> | null>(),
  fastMethodMd: text("fast_method_md"),
  desmos: jsonb("desmos").$type<{ expressions: string[]; stepsMd: string } | null>(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("active"), // active | retired
  version: integer("version").notNull().default(1),
}, (t) => [index("q_skill_diff").on(t.skillId, t.difficulty, t.status)]);

/* ───────── student model ───────── */
export const skillState = pgTable("skill_state", {
  userId: userRef(),
  skillId: text("skill_id").notNull(),
  selfRating: smallint("self_rating"),
  theta: real("theta").notNull().default(0),
  n: integer("n").notNull().default(0),
  nCorrect: integer("n_correct").notNull().default(0),
  totalTimeMs: integer("total_time_ms").notNull().default(0), // ponytail: int overflows at ~24 days of answering; fine
  lastPracticedAt: ts("last_practiced_at"),
}, (t) => [primaryKey({ columns: [t.userId, t.skillId] })]);

export const attempts = pgTable("attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userRef(),
  questionId: text("question_id").notNull().references(() => questions.id),
  skillId: text("skill_id").notNull(),
  context: text("context").notNull(), // practice | review | diagnostic | test
  sessionId: uuid("session_id"),
  response: text("response"),
  correct: boolean("correct").notNull(),
  timeMs: integer("time_ms").notNull(),
  confidence: smallint("confidence"),
  mistakeType: text("mistake_type"),
  thetaBefore: real("theta_before").notNull(),
  thetaAfter: real("theta_after").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [
  index("att_user_time").on(t.userId, t.createdAt),
  index("att_user_skill_time").on(t.userId, t.skillId, t.createdAt),
  index("att_user_question").on(t.userId, t.questionId),
]);

export const reviewItems = pgTable("review_items", {
  userId: userRef(),
  questionId: text("question_id").notNull().references(() => questions.id),
  stage: smallint("stage").notNull().default(0),
  dueAt: ts("due_at").notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.questionId] }), index("rev_user_due").on(t.userId, t.dueAt)]);

export const lessonProgress = pgTable("lesson_progress", {
  userId: userRef(),
  skillId: text("skill_id").notNull(), // skill id, or "desmos:<slug>"
  completedAt: ts("completed_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.skillId] })]);

/* ───────── tests ───────── */
export const testSessions = pgTable("test_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userRef(),
  kind: text("kind").notNull(), // diagnostic | full | section | module | mini | weakness | custom
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("in_progress"), // in_progress | completed | abandoned
  startedAt: ts("started_at").notNull().defaultNow(),
  completedAt: ts("completed_at"),
  result: jsonb("result").$type<Record<string, unknown> | null>(),
}, (t) => [index("ts_user_time").on(t.userId, t.startedAt)]);

export const testModules = pgTable("test_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => testSessions.id, { onDelete: "cascade" }),
  idx: smallint("idx").notNull(),
  section: text("section").notNull(),
  route: text("route").notNull().default("base"),
  timeLimitS: integer("time_limit_s"),
  startedAt: ts("started_at"),
  deadlineAt: ts("deadline_at"),
  submittedAt: ts("submitted_at"),
}, (t) => [index("tm_session").on(t.sessionId, t.idx)]);

export const testItems = pgTable("test_items", {
  moduleId: uuid("module_id").notNull().references(() => testModules.id, { onDelete: "cascade" }),
  position: smallint("position").notNull(),
  questionId: text("question_id").notNull().references(() => questions.id),
  response: text("response"),
  flagged: boolean("flagged").notNull().default(false),
  timeMs: integer("time_ms").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.moduleId, t.position] })]);

/* ───────── progress, plan, misc ───────── */
export const scoreSnapshots = pgTable("score_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userRef(),
  source: text("source").notNull(), // diagnostic | mock | model
  math: smallint("math").notNull(),
  rw: smallint("rw").notNull(),
  halfWidth: smallint("half_width").notNull(),
  takenAt: ts("taken_at").notNull().defaultNow(),
}, (t) => [index("ss_user_time").on(t.userId, t.takenAt)]);

export const dailyPlans = pgTable("daily_plans", {
  userId: userRef(),
  day: date("day").notNull(),
  blocks: jsonb("blocks").$type<unknown[]>().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.day] })]);

export const bookmarks = pgTable("bookmarks", {
  userId: userRef(),
  questionId: text("question_id").notNull().references(() => questions.id),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.questionId] })]);

export const questionReports = pgTable("question_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userRef(),
  questionId: text("question_id").notNull(),
  reason: text("reason").notNull(), // wrong_answer | unclear | typo | other
  note: text("note"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userRef(),
  questionId: text("question_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [index("ai_user_time").on(t.userId, t.createdAt)]);

export const aiCache = pgTable("ai_cache", {
  key: text("key").primaryKey(),
  content: text("content").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export type Question = typeof questions.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type SkillStateRow = typeof skillState.$inferSelect;
