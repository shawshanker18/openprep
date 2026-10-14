// Complete database schema (spec 01 §4). Text columns instead of enums; values validated by zod at the edge.
import { sql } from "drizzle-orm";
import {
  pgTable, check, uuid, text, integer, smallint, real, boolean, timestamp, date, jsonb, primaryKey, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Expr } from "@/engine/assignment";

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
  // CBSE maths chapters the student has finished (ids from content/cbse-chapters.ts); they mark SAT skills as likely covered.
  chaptersDone: jsonb("chapters_done").$type<string[]>().notNull().default([]),
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
  // Pool and bank-size counts group active questions by section; this index answers them without reading every row.
  index("questions_status_section_pool_idx").on(t.status, t.section, t.pool),
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

/* ───────── CBSE course assignment (brief §11) ───────── */
// Completed chapters are read from profiles.chaptersDone, the one existing source of truth. Nothing here duplicates it.

/** A chapter course: a title, the chapter whose completion routes students to its covered version, and the SAT skills whose lessons it owns. */
export const courses = pgTable("courses", {
  id: text("id").primaryKey(), // stable slug, e.g. "straight-lines"
  title: text("title").notNull(),
  chapterId: text("chapter_id"), // CBSE chapter id; informational, used to draft the "covered at school" rule
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}).enableRLS();

/** Which course owns a SAT skill's lesson. The primary key makes a skill belong to at most one course. */
export const courseSkills = pgTable("course_skills", {
  skillId: text("skill_id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
}).enableRLS();

/** A named group of students, so a rule can apply to some students only (a class, a cohort, a pilot). */
export const userGroups = pgTable("user_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdBy: uuid("created_by"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("user_groups_name_unique").on(sql`lower(${t.name})`),
  check("user_groups_name_check", sql`length(${t.name}) between 1 and 80`),
]).enableRLS();

export const userGroupMembers = pgTable("user_group_members", {
  groupId: uuid("group_id").notNull().references(() => userGroups.id, { onDelete: "cascade" }),
  userId: userRef(),
  addedBy: uuid("added_by"),
  addedAt: ts("added_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.groupId, t.userId] }),
  index("user_group_members_user_idx").on(t.userId),
]).enableRLS();

/** A version of a chapter course. Created and published by admins, never by code changes. */
export const courseVersions = pgTable("course_versions", {
  id: text("id").primaryKey(), // stable slug, e.g. "math-start-v2"
  courseId: text("course_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("draft"), // draft | published | retired
  /** The one version given to students when no rule matches. Only a published version can be the fallback. */
  isFallback: boolean("is_fallback").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [
  check("course_versions_status_check", sql`${t.status} in ('draft', 'published', 'retired')`),
  // One fallback per course (each chapter course has its own default version).
  uniqueIndex("course_versions_one_fallback").on(t.courseId).where(sql`${t.isFallback}`),
]).enableRLS();

/**
 * Lesson text a course version teaches in place of the built-in lesson file (content/lessons/<skill>.md). A version with
 * no row for a skill teaches the built-in lesson, so a default version needs no rows until an admin customises one.
 * `body` is the lesson's `##` sections, without frontmatter.
 */
export const courseVersionLessons = pgTable("course_version_lessons", {
  versionId: text("version_id").notNull().references(() => courseVersions.id, { onDelete: "cascade" }),
  skillId: text("skill_id").notNull(),
  body: text("body").notNull(),
  minutes: smallint("minutes"),
  updatedBy: uuid("updated_by"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.versionId, t.skillId] }),
  check("course_version_lessons_body_check", sql`length(${t.body}) between 1 and 40000`),
]).enableRLS();

/**
 * An assignment rule. Only `live` rules are evaluated. `draft` rules can be edited and previewed freely; `disabled`
 * rules are kept for history but ignored. Priority decides between matches; see engine/assignment.ts.
 */
export const assignmentRules = pgTable("assignment_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("draft"), // draft | live | disabled
  priority: integer("priority").notNull().default(0),
  targetVersionId: text("target_version_id").notNull().references(() => courseVersions.id),
  /** Chapters the student must have completed. Null = no chapter condition (then the rule needs a group). */
  condition: jsonb("condition").$type<Expr>(),
  /** Only members of this group can match. Null = every student. A group in use by a rule cannot be deleted. */
  groupId: uuid("group_id").references(() => userGroups.id, { onDelete: "restrict" }),
  effectiveFrom: ts("effective_from"),
  effectiveUntil: ts("effective_until"),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [
  check("assignment_rules_status_check", sql`${t.status} in ('draft', 'live', 'disabled')`),
  check("assignment_rules_scope_check", sql`${t.condition} is not null or ${t.groupId} is not null`),
  check("assignment_rules_window_check", sql`${t.effectiveFrom} is null or ${t.effectiveUntil} is null or ${t.effectiveFrom} < ${t.effectiveUntil}`),
  index("assignment_rules_status_priority_idx").on(t.status, t.priority),
]).enableRLS();

/** One row each time a student's outcome actually changes (not on every re-check), so the history reads as decisions. */
export const assignmentHistory = pgTable("assignment_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userRef(),
  courseId: text("course_id").notNull(),
  versionId: text("version_id").references(() => courseVersions.id),
  ruleId: uuid("rule_id").references(() => assignmentRules.id, { onDelete: "set null" }),
  outcome: text("outcome").notNull(), // assigned | fallback | unresolved
  reason: text("reason").notNull(),
  detail: jsonb("detail").$type<Record<string, unknown>>(),
  evaluatedAt: ts("evaluated_at").notNull().defaultNow(),
}, (t) => [
  check("assignment_history_outcome_check", sql`${t.outcome} in ('assigned', 'fallback', 'unresolved')`),
  index("assignment_history_user_time").on(t.userId, t.evaluatedAt),
]).enableRLS();

/** The student's current version of each course: at most one row per student per course. Lesson progress is never touched by reassignment. */
export const studentCourseAssignments = pgTable("student_course_assignments", {
  userId: userRef(),
  courseId: text("course_id").notNull(),
  versionId: text("version_id").notNull().references(() => courseVersions.id),
  ruleId: uuid("rule_id").references(() => assignmentRules.id, { onDelete: "set null" }),
  outcome: text("outcome").notNull(), // assigned | fallback
  assignedAt: ts("assigned_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.courseId] })]).enableRLS();

