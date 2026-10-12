import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type {
  AssessmentQuestion,
  CodeRun,
  DailyItem,
  IntakeAnswers,
  Label,
  LessonSnapshot,
  QuestionUse,
  RadarTag,
  RubricResult,
  SourcePacket,
  TermAnswer,
  TopicEventKind,
  TopicProgress,
  TopicState,
} from "@ken-os/domain";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const googleConnections = pgTable("google_connections", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const artifactSelections = pgTable(
  "artifact_selections",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull(),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.purpose] })],
);

export const memoryProjects = pgTable("memory_projects", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  repository: text("repository").notNull(),
  sharingMode: text("sharing_mode").notNull(),
  activePolicyVersion: integer("active_policy_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memoryPolicies = pgTable(
  "memory_policies",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => memoryProjects.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    digest: text("digest").notNull(),
    document: jsonb("document").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.version] })],
);

export const memoryDecisions = pgTable(
  "memory_decisions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => memoryProjects.id, { onDelete: "cascade" }),
    taskKey: text("task_key"),
    idempotencyKey: text("idempotency_key").notNull(),
    digest: text("digest").notNull(),
    title: text("title").notNull(),
    issue: text("issue").notNull(),
    choice: text("choice").notNull(),
    rationale: text("rationale").notNull(),
    alternatives: jsonb("alternatives").$type<string[]>().notNull(),
    provenance: text("provenance").notNull(),
    status: text("status").notNull(),
    policyVersion: integer("policy_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("memory_decisions_idempotency_unique").on(table.projectId, table.idempotencyKey)],
);

export const memoryDecisionRevisions = pgTable(
  "memory_decision_revisions",
  {
    id: text("id").primaryKey(),
    decisionId: text("decision_id")
      .notNull()
      .references(() => memoryDecisions.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    action: text("action").notNull(),
    editor: text("editor").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("memory_decision_revisions_unique").on(table.decisionId, table.version)],
);

export const memoryReceipts = pgTable(
  "memory_receipts",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => memoryProjects.id, { onDelete: "cascade" }),
    taskKey: text("task_key").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    digest: text("digest").notNull(),
    outcome: text("outcome").notNull(),
    verification: jsonb("verification").$type<string[]>().notNull(),
    remaining: jsonb("remaining").$type<string[]>().notNull(),
    status: text("status").notNull(),
    policyVersion: integer("policy_version").notNull(),
    sourceAdapter: text("source_adapter").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("memory_receipts_idempotency_unique").on(table.projectId, table.idempotencyKey)],
);

export const memoryReceiptRevisions = pgTable(
  "memory_receipt_revisions",
  {
    id: text("id").primaryKey(),
    receiptId: text("receipt_id")
      .notNull()
      .references(() => memoryReceipts.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    action: text("action").notNull(),
    editor: text("editor").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("memory_receipt_revisions_unique").on(table.receiptId, table.version)],
);

export const memoryEvidence = pgTable("memory_evidence", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => memoryProjects.id, { onDelete: "cascade" }),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  kind: text("kind").notNull(),
  locator: text("locator").notNull(),
  relation: text("relation").notNull(),
  availability: text("availability").notNull().default("unverified"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memoryCredentials = pgTable("memory_credentials", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => memoryProjects.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  usageWindowStartedAt: timestamp("usage_window_started_at", { withTimezone: true }).notNull().defaultNow(),
  usageCount: integer("usage_count").notNull().default(0),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  googleConnection: one(googleConnections),
  artifactSelections: many(artifactSelections),
  memoryProjects: many(memoryProjects),
}));

export const googleConnectionsRelations = relations(googleConnections, ({ one }) => ({
  user: one(users, { fields: [googleConnections.userId], references: [users.id] }),
}));

export const artifactSelectionsRelations = relations(artifactSelections, ({ one }) => ({
  user: one(users, { fields: [artifactSelections.userId], references: [users.id] }),
}));

// Engineering. Spec: docs/architecture/engineering-rebuild.md, section 6. Everything except lab_progress and lab_profile
// is append-only: runs, answers, questions and topic events are evidence, and progress is rebuilt from them.

export const labSourcePackets = pgTable(
  "lab_source_packets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    packet: jsonb("packet").$type<SourcePacket>().notNull(),
    refreshAfter: text("refresh_after").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("lab_source_packets_generated_unique").on(table.userId, table.topicId, table.generatedAt)],
);

export const labLessons = pgTable(
  "lab_lessons",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    version: integer("version").notNull(),
    sourcePacketId: text("source_packet_id")
      .notNull()
      .references(() => labSourcePackets.id),
    snapshot: jsonb("snapshot").$type<LessonSnapshot>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("lab_lessons_version_unique").on(table.userId, table.topicId, table.version)],
);

/** One assessment. It keeps the questions as they were when it started, so a taken assessment never changes. */
export const labRuns = pgTable(
  "lab_runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questions: jsonb("questions").$type<AssessmentQuestion[]>().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("lab_runs_user_idx").on(table.userId, table.startedAt)],
);

/** An answer locks on submit. The grade is filled in afterwards; it stays null while grading has failed. */
export const labRunAnswers = pgTable(
  "lab_run_answers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    runId: text("run_id")
      .notNull()
      .references(() => labRuns.id, { onDelete: "cascade" }),
    questionIndex: integer("question_index").notNull(),
    answer: text("answer").notNull(),
    /** Predict questions: the printed lines you predicted. */
    output: jsonb("output").$type<string[]>(),
    selfRating: integer("self_rating").notNull(),
    label: text("label").$type<Label>(),
    rubric: jsonb("rubric").$type<RubricResult[]>(),
    feedback: text("feedback"),
    /** The Assessor's prompt version and model, for the evidence page. */
    graderVersion: text("grader_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("lab_run_answers_question_unique").on(table.runId, table.questionIndex)],
);

/** A proof prompt or a practice question the Assessor wrote for one topic, from its assessment points. */
export const labQuestions = pgTable(
  "lab_questions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    kind: text("kind").$type<QuestionUse>().notNull(),
    prompt: text("prompt").notNull(),
    code: text("code"),
    rubric: jsonb("rubric").$type<string[]>().notNull(),
    referenceAnswer: text("reference_answer").notNull(),
    promptVersion: text("prompt_version").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("lab_questions_user_topic_idx").on(table.userId, table.topicId, table.createdAt)],
);

/** Everything that moves a topic: a lesson opened, an exercise run, the solution opened, a proof or a review answer. */
export const labTopicEvents = pgTable(
  "lab_topic_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    kind: text("kind").$type<TopicEventKind>().notNull(),
    labId: text("lab_id"),
    /** exercise_run: every test passed. proof: every rubric line met. */
    passed: boolean("passed"),
    code: text("code"),
    results: jsonb("results").$type<CodeRun>(),
    questionId: text("question_id").references(() => labQuestions.id),
    answer: text("answer"),
    selfRating: integer("self_rating"),
    label: text("label").$type<Label>(),
    rubric: jsonb("rubric").$type<RubricResult[]>(),
    feedback: text("feedback"),
    graderVersion: text("grader_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("lab_topic_events_user_topic_idx").on(table.userId, table.topicId, table.createdAt),
    // A practice question is answered once; a retried submit can't record a second review.
    uniqueIndex("lab_topic_events_review_unique")
      .on(table.questionId)
      .where(sql`${table.kind} = 'review'`),
  ],
);

/** One row per person: the intake, the target role and hours per week. */
export const labProfile = pgTable("lab_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** The target role id. */
  direction: text("direction"),
  intake: jsonb("intake").$type<IntakeAnswers>(),
  weeklyHours: integer("weekly_hours"),
  /** Retired with the Guide. Always empty; dropped in a later release. */
  conversation: jsonb("conversation").$type<unknown[]>().notNull().default([]),
  /** Retired with the Guide. Always empty; dropped in a later release. */
  addedChapters: jsonb("added_chapters").$type<unknown[]>().notNull().default([]),
  radarCheckedWeek: text("radar_checked_week"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A day's practice set, stored so it stays the same if you leave and come back. */
export const labDailySets = pgTable(
  "lab_daily_sets",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    items: jsonb("items").$type<DailyItem[]>().notNull(),
    warmUp: boolean("warm_up").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.day] })],
);

export const labRadarItems = pgTable(
  "lab_radar_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    week: text("week").notNull(),
    area: text("area").notNull(),
    tag: text("tag").$type<RadarTag>().notNull(),
    title: text("title").notNull(),
    reason: text("reason").notNull(),
    sourceUrl: text("source_url"),
    /** For a re-check flag: the proven topic whose facts changed. */
    topicId: text("topic_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  },
  (table) => [index("lab_radar_items_user_week_idx").on(table.userId, table.week)],
);

/** Rebuilt from lab_topic_events on every change; never the source of truth. */
export const labProgress = pgTable(
  "lab_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    status: text("status").$type<TopicState>().notNull(),
    progress: jsonb("progress").$type<TopicProgress>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.topicId] })],
);

// Retired by the rebuild (2026-10-10). Emptied by migration 0010 and read by nothing; dropped in a later release, once
// no deployed code can still reach them. Columns stay exactly as they were so no migration touches them until then.

export const labAssessmentRuns = pgTable(
  "lab_assessment_runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    plan: jsonb("plan").notNull(),
    generations: integer("generations").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("lab_assessment_runs_user_idx").on(table.userId, table.startedAt),
    uniqueIndex("lab_assessment_runs_one_baseline")
      .on(table.userId)
      .where(sql`${table.kind} = 'baseline'`),
  ],
);

export const labAssessments = pgTable(
  "lab_assessments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    kind: text("kind").notNull(),
    items: jsonb("items").notNull(),
    promptVersion: text("prompt_version").notNull(),
    model: text("model").notNull(),
    origin: text("origin").notNull().default("topic"),
    runId: text("run_id").references(() => labAssessmentRuns.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("lab_assessments_user_topic_idx").on(table.userId, table.topicId, table.createdAt)],
);

export const labChapterScreens = pgTable(
  "lab_chapter_screens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    setId: text("set_id").notNull(),
    runId: text("run_id").references(() => labAssessmentRuns.id, { onDelete: "cascade" }),
    chapterId: text("chapter_id").notNull(),
    itemIndex: integer("item_index").notNull(),
    item: jsonb("item").notNull(),
    promptVersion: text("prompt_version").notNull(),
    model: text("model").notNull(),
    response: jsonb("response"),
    selfRating: integer("self_rating"),
    label: text("label"),
    misconceptions: jsonb("misconceptions"),
    feedback: text("feedback"),
    rubric: jsonb("rubric"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("lab_chapter_screens_item_unique").on(table.setId, table.chapterId, table.itemIndex),
    index("lab_chapter_screens_user_idx").on(table.userId, table.chapterId),
  ],
);

export const labAttempts = pgTable(
  "lab_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    kind: text("kind").notNull(),
    mode: text("mode").notNull(),
    lessonId: text("lesson_id").references(() => labLessons.id),
    assessmentId: text("assessment_id").references(() => labAssessments.id),
    itemIndex: integer("item_index"),
    labId: text("lab_id"),
    item: jsonb("item").notNull(),
    response: jsonb("response").notNull(),
    selfRating: integer("self_rating"),
    label: text("label").notNull(),
    gradedBy: text("graded_by").notNull(),
    voided: boolean("voided").notNull().default(false),
    misconceptions: jsonb("misconceptions").notNull(),
    feedback: text("feedback").notNull(),
    run: jsonb("run"),
    rubric: jsonb("rubric"),
    solutionSeen: boolean("solution_seen").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("lab_attempts_user_topic_idx").on(table.userId, table.topicId, table.createdAt),
    uniqueIndex("lab_attempts_item_unique").on(table.assessmentId, table.itemIndex),
  ],
);

export const labSolutionReveals = pgTable(
  "lab_solution_reveals",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    labId: text("lab_id").notNull(),
    revealedAt: timestamp("revealed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.labId] })],
);

export const labProgressChanges = pgTable(
  "lab_progress_changes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    fromStatus: text("from_status").notNull(),
    toStatus: text("to_status").notNull(),
    attemptId: text("attempt_id").references(() => labAttempts.id),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("lab_progress_changes_user_idx").on(table.userId, table.createdAt)],
);

// Ken OS-wide term lookup. A saved term is one per spelling (term_key); lookups are logged only to enforce the daily limit.
export const kenTerms = pgTable(
  "ken_terms",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    termKey: text("term_key").notNull(),
    meaning: text("meaning").notNull(),
    sourceTitle: text("source_title"),
    sourceUrl: text("source_url"),
    /** Where it was looked up, in words, such as "Engineering Lab · Event loop". */
    foundIn: text("found_in").notNull(),
    /** The Ken OS path it was found on, so the Terms page can link back. Always a same-site path. */
    foundAt: text("found_at").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("ken_terms_user_key_unique").on(table.userId, table.termKey)],
);

export const kenTermLookups = pgTable(
  "ken_term_lookups",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    /** What was looked up, normalized, and the answer, so the same term is answered again without an AI call. */
    termKey: text("term_key"),
    answer: jsonb("answer").$type<TermAnswer>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ken_term_lookups_user_idx").on(table.userId, table.createdAt),
    index("ken_term_lookups_user_key_idx").on(table.userId, table.termKey, table.createdAt),
  ],
);
