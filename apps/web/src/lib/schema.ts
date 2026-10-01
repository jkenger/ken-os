import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { AssessmentItem, AttemptKind, AttemptResponse, CodeRun, Grade, Label, LessonSnapshot, Mode, SourcePacket, Status, TopicProgress } from "@ken-os/domain";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const googleConnections = pgTable("google_connections", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const artifactSelections = pgTable("artifact_selections", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.purpose] })]);

export const skills = pgTable("skills", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  version: integer("version").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  files: jsonb("files").$type<Record<string, string>>().notNull(),
  digest: text("digest").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("skills_owner_slug_version_unique").on(table.userId, table.slug, table.version),
  uniqueIndex("skills_one_enabled_version_unique").on(table.userId, table.slug).where(sql`${table.enabled} = true`),
]);

export const memoryProjects = pgTable("memory_projects", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  repository: text("repository").notNull(),
  sharingMode: text("sharing_mode").notNull(),
  activePolicyVersion: integer("active_policy_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memoryPolicies = pgTable("memory_policies", {
  projectId: text("project_id").notNull().references(() => memoryProjects.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  digest: text("digest").notNull(),
  document: jsonb("document").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.projectId, table.version] })]);

export const memoryDecisions = pgTable("memory_decisions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => memoryProjects.id, { onDelete: "cascade" }),
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
}, (table) => [uniqueIndex("memory_decisions_idempotency_unique").on(table.projectId, table.idempotencyKey)]);

export const memoryDecisionRevisions = pgTable("memory_decision_revisions", {
  id: text("id").primaryKey(),
  decisionId: text("decision_id").notNull().references(() => memoryDecisions.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  action: text("action").notNull(),
  editor: text("editor").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("memory_decision_revisions_unique").on(table.decisionId, table.version)]);

export const memoryReceipts = pgTable("memory_receipts", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => memoryProjects.id, { onDelete: "cascade" }),
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
}, (table) => [uniqueIndex("memory_receipts_idempotency_unique").on(table.projectId, table.idempotencyKey)]);

export const memoryReceiptRevisions = pgTable("memory_receipt_revisions", {
  id: text("id").primaryKey(),
  receiptId: text("receipt_id").notNull().references(() => memoryReceipts.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  action: text("action").notNull(),
  editor: text("editor").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("memory_receipt_revisions_unique").on(table.receiptId, table.version)]);

export const memoryEvidence = pgTable("memory_evidence", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => memoryProjects.id, { onDelete: "cascade" }),
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
  projectId: text("project_id").notNull().references(() => memoryProjects.id, { onDelete: "cascade" }),
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
  skills: many(skills),
  memoryProjects: many(memoryProjects),
}));

export const googleConnectionsRelations = relations(googleConnections, ({ one }) => ({
  user: one(users, { fields: [googleConnections.userId], references: [users.id] }),
}));

export const artifactSelectionsRelations = relations(artifactSelections, ({ one }) => ({
  user: one(users, { fields: [artifactSelections.userId], references: [users.id] }),
}));

export const skillsRelations = relations(skills, ({ one }) => ({
  user: one(users, { fields: [skills.userId], references: [users.id] }),
}));

// Engineering Lab. Every table except lab_progress is append-only: lessons, questions and attempts are evidence.
// Design: docs/architecture/engineering-lab-v0.md, section 2.

export const labSourcePackets = pgTable("lab_source_packets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicId: text("topic_id").notNull(),
  packet: jsonb("packet").$type<SourcePacket>().notNull(),
  refreshAfter: text("refresh_after").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("lab_source_packets_generated_unique").on(table.userId, table.topicId, table.generatedAt)]);

export const labLessons = pgTable("lab_lessons", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicId: text("topic_id").notNull(),
  version: integer("version").notNull(),
  sourcePacketId: text("source_packet_id").notNull().references(() => labSourcePackets.id),
  snapshot: jsonb("snapshot").$type<LessonSnapshot>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("lab_lessons_version_unique").on(table.userId, table.topicId, table.version)]);

export const labAssessments = pgTable("lab_assessments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicId: text("topic_id").notNull(),
  kind: text("kind").$type<"assessment" | "review">().notNull(),
  items: jsonb("items").$type<AssessmentItem[]>().notNull(),
  promptVersion: text("prompt_version").notNull(),
  model: text("model").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("lab_assessments_user_topic_idx").on(table.userId, table.topicId, table.createdAt)]);

export const labAttempts = pgTable("lab_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicId: text("topic_id").notNull(),
  kind: text("kind").$type<AttemptKind>().notNull(),
  mode: text("mode").$type<Mode>().notNull(),
  lessonId: text("lesson_id").references(() => labLessons.id),
  assessmentId: text("assessment_id").references(() => labAssessments.id),
  itemIndex: integer("item_index"),
  labId: text("lab_id"),
  item: jsonb("item").$type<Record<string, unknown>>().notNull(),
  response: jsonb("response").$type<AttemptResponse>().notNull(),
  selfRating: integer("self_rating"),
  label: text("label").$type<Label>().notNull(),
  gradedBy: text("graded_by").$type<Grade["by"]>().notNull(),
  voided: boolean("voided").notNull().default(false),
  misconceptions: jsonb("misconceptions").$type<string[]>().notNull(),
  feedback: text("feedback").notNull(),
  run: jsonb("run").$type<CodeRun>(),
  solutionSeen: boolean("solution_seen").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("lab_attempts_user_topic_idx").on(table.userId, table.topicId, table.createdAt),
  // One answer per question: a retried or double-clicked submit can't create a second graded attempt.
  uniqueIndex("lab_attempts_item_unique").on(table.assessmentId, table.itemIndex),
]);

export const labSolutionReveals = pgTable("lab_solution_reveals", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  labId: text("lab_id").notNull(),
  revealedAt: timestamp("revealed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.labId] })]);

export const labProgress = pgTable("lab_progress", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicId: text("topic_id").notNull(),
  status: text("status").$type<Status>().notNull(),
  progress: jsonb("progress").$type<TopicProgress>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.topicId] })]);

export const labProgressChanges = pgTable("lab_progress_changes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicId: text("topic_id").notNull(),
  fromStatus: text("from_status").$type<Status>().notNull(),
  toStatus: text("to_status").$type<Status>().notNull(),
  attemptId: text("attempt_id").references(() => labAttempts.id),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("lab_progress_changes_user_idx").on(table.userId, table.createdAt)]);
