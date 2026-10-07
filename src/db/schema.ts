// Complete database schema (spec 01 §4). Text columns instead of enums; values validated by zod at the edge.
import { sql } from "drizzle-orm";
import {
  pgTable, check, uuid, text, integer, smallint, real, boolean, timestamp, date, jsonb, primaryKey, index,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });
const userRef = () => uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" });

/* ───────── users ───────── */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  createdAt: ts("created_at").notNull().defaultNow(),
  onboardingStep: text("onboarding_step").notNull().default("survey"), // survey | self (legacy) | diagnostic | diagnostic_skipped | done
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  grade: smallint("grade"),
  curriculum: text("curriculum"),
  topicsStudied: jsonb("topics_studied").$type<string[]>().notNull().default([]),
  subjects: jsonb("subjects").$type<string[]>().notNull().default([]),
  englishBackground: text("english_background"),
  priorMath: smallint("prior_math"),
  priorRw: smallint("prior_rw"),
  targetScore: smallint("target_score"),
  testDate: date("test_date"),
  minutesPerDay: smallint("minutes_per_day").notNull().default(45),
  daysPerWeek: smallint("days_per_week").notNull().default(5),
  reminderHour: smallint("reminder_hour"), // local hour 0–23 for the daily practice reminder; null = off
  dashboardLayout: jsonb("dashboard_layout").$type<{ id: string; visible: boolean }[] | null>(), // null = automatic default
  weeklyFocus: jsonb("weekly_focus").$type<{ weekOf: string; skillIds: string[] } | null>(),
});

// One bounded row per student; the practice API updates this atomically.
export const practiceRateWindows = pgTable("practice_rate_windows", {
  userId: userRef().primaryKey(),
  windowStart: ts("window_start").notNull(),
  requests: integer("requests").notNull(),
}, (table) => [check("practice_rate_windows_requests_check", sql`${table.requests} >= 0`)]).enableRLS();

export const satAttempts = pgTable("sat_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userRef(),
  takenOn: date("taken_on").notNull(),
  math: smallint("math").notNull(),
  rw: smallint("rw").notNull(),
}, (t) => [index("sat_user").on(t.userId)]);

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
  // study = practice and the question bank; test = mock tests and the diagnostic only (see docs/QUESTION_POOLS.md).
  pool: text("pool").notNull().default("study"),
}, (t) => [
  check("questions_pool_check", sql`${t.pool} in ('study', 'test')`),
  index("q_skill_diff").on(t.skillId, t.difficulty, t.status),
  index("questions_active_skill_difficulty_id_idx").on(t.skillId, t.difficulty, t.id).where(sql`${t.status} = 'active'`),
]);

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
  index("att_user_question_created_idx").on(t.userId, t.questionId, t.createdAt.desc(), t.id.desc()),
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
  servedAt: ts("served_at").defaultNow(), // when the server handed this item out (diagnostic timing)
}, (t) => [primaryKey({ columns: [t.moduleId, t.position] }), index("ti_question").on(t.questionId)]);

/** Server-side clock for practice: when each question was last served to each student. */
export const questionServes = pgTable("question_serves", {
  userId: userRef(),
  questionId: text("question_id").notNull(),
  servedAt: ts("served_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.questionId] }),
  index("qs_user_served_at_idx").on(t.userId, t.servedAt.desc()),
]);

/**
 * Sign-up cap: our server issues a short-lived ticket (email + the requester's real IP) before every sign-in
 * attempt. Supabase's before-user-created hook (drizzle/0008) only creates an account that has a fresh ticket, and
 * at most 3 per IP per day. Not tied to profiles: the account doesn't exist yet.
 */
export const signupTickets = pgTable("signup_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  ip: text("ip").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  usedAt: ts("used_at"),
}, (t) => [index("signup_tickets_email_idx").on(t.email, t.createdAt), index("signup_tickets_ip_idx").on(t.ip, t.usedAt)]);

/** Vulnerability reports from /security (the security.txt contact). Read them in the database console. */
// Admin handling, shared by every inbox (security reports, question reports, feedback).
const handled = () => ({
  status: text("status").notNull().default("new"), // new | in_progress | resolved | dismissed
  adminNote: text("admin_note"),
  handledBy: uuid("handled_by"),
  handledAt: ts("handled_at"),
});

export const securityReports = pgTable("security_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  ip: text("ip").notNull(),
  contact: text("contact"),
  message: text("message").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  ...handled(),
}, (t) => [index("security_reports_ip_idx").on(t.ip, t.createdAt), index("security_reports_status_idx").on(t.status, t.createdAt)]);

/** Bugs, errors, reviews and ideas from students (or signed-out visitors, then `userId` is null). */
export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
  kind: text("kind").notNull(), // bug | error | review | idea | other
  rating: smallint("rating"), // 1–5, reviews only
  message: text("message").notNull(),
  page: text("page"), // where it was sent from
  contact: text("contact"),
  ip: text("ip").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  ...handled(),
}, (t) => [index("feedback_status_idx").on(t.status, t.createdAt), index("feedback_user_idx").on(t.userId, t.createdAt), index("feedback_ip_idx").on(t.ip, t.createdAt)]);

/**
 * Admins. Granted only from the backend (SQL, or `npm run admin`): the app's database role can read this table but
 * never write it (drizzle/0010), so no request to the site can make anyone an admin.
 */
export const admins = pgTable("admins", {
  userId: uuid("user_id").primaryKey(),
  note: text("note"),
  grantedAt: ts("granted_at").notNull().defaultNow(),
});

/** Every admin action, append-only (the app can add rows, never change or delete them). */
export const adminAudit = pgTable("admin_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").notNull(),
  action: text("action").notNull(),
  target: text("target"),
  detail: jsonb("detail").$type<Record<string, unknown>>(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [index("admin_audit_time_idx").on(t.createdAt)]);

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
  note: text("note").notNull().default(""),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.questionId] })]);

export const questionReports = pgTable("question_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userRef(),
  questionId: text("question_id").notNull(),
  reason: text("reason").notNull(), // wrong_answer | unclear | typo | other
  note: text("note"),
  createdAt: ts("created_at").notNull().defaultNow(),
  ...handled(),
}, (t) => [index("qr_user_time").on(t.userId, t.createdAt), index("qr_status_time").on(t.status, t.createdAt)]);

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userRef(),
  questionId: text("question_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [index("ai_user_time").on(t.userId, t.createdAt)]);

/** One row per device that allowed push notifications (web push / installed app). */
export const pushSubscriptions = pgTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  userId: userRef(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  lastSentOn: date("last_sent_on"), // local date of the last reminder, so each device gets at most one a day
}, (t) => [index("push_user").on(t.userId)]);

export const aiCache = pgTable("ai_cache", {
  key: text("key").primaryKey(),
  content: text("content").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export type Question = typeof questions.$inferSelect;
/** Private first-exposure ledger; also supplies cross-account monitoring. Never exposed through the Data API. */
export const questionExposures = pgTable("question_exposures", {
  userId: userRef(),
  questionId: text("question_id").notNull().references(() => questions.id),
  skillId: text("skill_id").notNull(),
  ipHash: text("ip_hash"), deviceHash: text("device_hash"),
  firstAt: ts("first_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.questionId] }),
  index("exposure_user_time").on(t.userId, t.firstAt), index("exposure_skill_time").on(t.userId, t.skillId, t.firstAt),
  index("exposure_ip_time").on(t.ipHash, t.firstAt), index("exposure_device_time").on(t.deviceHash, t.firstAt),
  index("exposure_question_time").on(t.questionId, t.firstAt)]);

export const deliveryGuards = pgTable("delivery_guards", { id: text("id").primaryKey(), expiresAt: ts("expires_at").notNull().defaultNow() });
/** Bounded rolling request/event windows, shared across all app instances and Redis outages. */
export const deliveryWindows = pgTable("delivery_windows", {
  id: text("id").primaryKey(), times: jsonb("times").$type<number[]>().notNull().default([]),
  expiresAt: ts("expires_at").notNull(),
});
export type Profile = typeof profiles.$inferSelect;
export type SkillStateRow = typeof skillState.$inferSelect;
export { r2Files } from "./storage-schema";


/** Saved practice state is server-only; future questions are selected only when reached. */
export const practiceSessions = pgTable("practice_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userRef(),
  config: jsonb("config").$type<import("@/server/papers").PaperConfig>().notNull(),
  title: text("title").notNull(),
  back: text("back"),
  cursor: integer("cursor").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [index("practice_sessions_user_time").on(t.userId, t.updatedAt),
  check("practice_sessions_cursor_check", sql`${t.cursor} >= 0 and ${t.cursor} <= 100`),
  check("practice_sessions_status_check", sql`${t.status} in ('active', 'completed')`)]).enableRLS();

export const practiceSessionItems = pgTable("practice_session_items", {
  sessionId: uuid("session_id").notNull().references(() => practiceSessions.id, {onDelete: "cascade"}),
  position: integer("position").notNull(),
  questionId: text("question_id").notNull().references(() => questions.id),
  response: text("response"),
  timeMs: integer("time_ms").notNull().default(0),
  attemptId: uuid("attempt_id").references(() => attempts.id),
  servedAt: ts("served_at").notNull(),
}, (t) => [primaryKey({columns: [t.sessionId, t.position]}),
  check("practice_session_items_position_check", sql`${t.position} >= 0 and ${t.position} < 100`),
  check("practice_session_items_time_check", sql`${t.timeMs} >= 0 and ${t.timeMs} <= 86400000`),
  check("practice_session_items_response_check", sql`${t.response} is null or length(${t.response}) <= 8`)]).enableRLS();
