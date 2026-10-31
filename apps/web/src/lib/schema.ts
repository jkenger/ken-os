import { relations, sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  ClaudeRunner,
  CodeRun,
  ContentSource,
  ExerciseCheck,
  Label,
  PaperSize,
  ProfileDetails,
  ResumeTemplate,
  RewriteSuggestion,
  AnalysisSection,
  RubricResult,
  TermAnswer,
  TopicEventKind,
  TopicProgress,
  TopicState,
  StoredTopicStatus,
} from "@ken-os/domain";
import type { PortfolioSnapshot } from "@ken-os/portfolio";
import type { BuildEvidence } from "../features/engineering-lab/build-evidence";
import type { ReviewSheet } from "../features/engineering-lab/review-sheet";
import type { Difficulty, TopicMaterial } from "../features/engineering-lab/topic-material";
import type { LookChange, TokenChange } from "../features/design-studio/drafts";
import type { AlertSource } from "../features/jobs/known-senders";
import type { JobMatchState } from "../features/jobs/raw-posting";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Drive grants from before Drive was dropped (25 Oct 2026). Nothing reads or writes it; kept per the migration rule. */
export const googleConnections = pgTable("google_connections", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** The Drive file once picked as the resume. Nothing reads or writes it since Drive was dropped; kept per the migration
 *  rule. */
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

/** The owner's career details, one row per person. Every resume is a view of these. Spec: docs/product/profile-resume.md. */
export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  details: jsonb("details").$type<ProfileDetails>().notNull(),
  /** The resume template and paper size last chosen on the Resume page. */
  template: text("template").$type<ResumeTemplate>().notNull().default("classic"),
  paper: text("paper").$type<PaperSize>().notNull().default("letter"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/** Resume files the owner uploaded, kept as they came in. Uploading reads nothing into the Profile; Autofill does,
 *  on request. Spec: docs/product/profile-resume.md, "Step 5 design". */
export const profileResumes = pgTable(
  "profile_resumes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    /** Detected from the file's first bytes, never taken from the browser. */
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    data: bytea("data").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("profile_resumes_user_idx").on(table.userId, table.uploadedAt)],
);

/** Each Autofill read of a resume into Profile fields. Append-only: a draft is `pending` until the owner saves it, then
 *  `applied`. Older rows are Drive imports, with `drive_file_id` and `drive_modified_time` set. */
export const profileImports = pgTable(
  "profile_imports",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Set only on old imports from Drive. */
    driveFileId: text("drive_file_id"),
    /** The uploaded file an autofill read. Null once that file is deleted. */
    resumeFileId: text("resume_file_id").references(() => profileResumes.id, { onDelete: "set null" }),
    driveModifiedTime: text("drive_modified_time"),
    draft: jsonb("draft").$type<ProfileDetails>().notNull(),
    status: text("status").$type<"pending" | "applied">().notNull().default("pending"),
    promptVersion: text("prompt_version").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
  },
  (table) => [index("profile_imports_user_created_idx").on(table.userId, table.createdAt)],
);

/** Each AI rewrite run: the suggestions it made, after the number check. Append-only; what the owner accepts lands
 *  in `profiles` only when they save. */
export const profileRewrites = pgTable(
  "profile_rewrites",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetRole: text("target_role").notNull().default(""),
    suggestions: jsonb("suggestions").$type<RewriteSuggestion[]>().notNull(),
    promptVersion: text("prompt_version").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("profile_rewrites_user_created_idx").on(table.userId, table.createdAt)],
);

/** One run of the Profile analyzer. Profile shows the newest; older runs stay as a record of what was suggested. */
export const profileAnalyses = pgTable(
  "profile_analyses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sections: jsonb("sections").$type<AnalysisSection[]>().notNull(),
    promptVersion: text("prompt_version").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("profile_analyses_user_created_idx").on(table.userId, table.createdAt)],
);

/** Each Portfolio publish: the exact snapshot the public site was given. Append-only; `version` goes up by one per
 *  owner. Spec: docs/architecture/portfolio.md. */
export const portfolioPublications = pgTable(
  "portfolio_publications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").$type<PortfolioSnapshot>().notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("portfolio_publications_user_version_idx").on(table.userId, table.version)],
);

/** Which publication is live. A null `current_publication_id` means unpublished: the public endpoint returns 404. */
export const portfolios = pgTable("portfolios", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  currentPublicationId: text("current_publication_id").references(() => portfolioPublications.id, {
    onDelete: "set null",
  }),
  /** Publish copies the Profile email into the snapshot only when this is on. */
  showEmail: boolean("show_email").notNull().default(false),
  /** Roadmap ids shown on the site. Null until the owner flips a switch: then the roadmap opened last is shown. */
  shownRoadmaps: jsonb("shown_roadmaps").$type<string[]>(),
  /** Topic ids whose Learned explanation the owner switched on. Off by default. */
  shownExplanations: jsonb("shown_explanations").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** The Design Studio's unexported edits, one per token or component: a token edit (`target` is the token name) or a
 *  Look edit (`target` is the component id). Export turns them into code. Spec: docs/architecture/design-studio.md. */
export const designStudioDrafts = pgTable(
  "design_studio_drafts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"token" | "component">().notNull(),
    target: text("target").notNull(),
    change: jsonb("change").$type<TokenChange | LookChange>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.kind, table.target] })],
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

// Engineering. Spec: docs/architecture/engineering-claude-first.md. Topic events are append-only evidence; statuses and
// lab_progress are rebuilt from them. The old screens' tables were dropped in migration 0016.

/**
 * Claude's exercise versions for a topic (docs/architecture/engineering-claude-connector.md, section 4). The repo lab is
 * version 0 and isn't stored here. A row never changes after it is saved, except its check result and its lock: a
 * changed exercise is a new version.
 */
export const labExercises = pgTable(
  "lab_exercises",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    version: integer("version").notNull(),
    source: text("source").$type<"repo" | "claude">().notNull(),
    runner: text("runner").$type<ClaudeRunner>().notNull(),
    task: text("task").notNull(),
    starter: text("starter").notNull(),
    tests: text("tests").notNull(),
    solution: text("solution").notNull(),
    /** pglite: SQL run on a fresh database before the code. */
    setup: text("setup").notNull().default(""),
    hint: text("hint"),
    checked: text("checked").$type<ExerciseCheck>().notNull().default("unchecked"),
    checkProblem: text("check_problem"),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    /** The owner's first run. */
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("lab_exercises_version_unique").on(table.userId, table.topicId, table.version)],
);

/** The owner's code for one exercise version, autosaved as they type, so Claude can read it. */
export const labExerciseDrafts = pgTable(
  "lab_exercise_drafts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The repo lab's id or a lab_exercises id, the same lab id runs record. */
    labId: text("lab_id").notNull(),
    code: text("code").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.labId] })],
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
    questionId: text("question_id"),
    answer: text("answer"),
    selfRating: integer("self_rating"),
    label: text("label").$type<Label>(),
    rubric: jsonb("rubric").$type<RubricResult[]>(),
    feedback: text("feedback"),
    graderVersion: text("grader_version"),
    source: text("source").$type<ContentSource>().notNull().default("ken-os"),
    /** report and status_set: the status set, if any (docs/architecture/engineering-claude-first.md, section 2). */
    status: text("status").$type<StoredTopicStatus>(),
    /** report: Claude's one-line summary of the session. status_set: the owner's reason, for Learned. */
    summary: text("summary"),
    /** report: where the owner got stuck that session, if anywhere. */
    stuck: text("stuck"),
    /** report setting Learned: the owner's own explanation, word for word. */
    evidence: text("evidence"),
    /** report setting Learned: Claude's note on how the owner got there, such as hints given. */
    evidenceNote: text("evidence_note"),
    /** report ticking Build: where the owner built it, their final code word for word, and Claude's note. */
    build: jsonb("build").$type<BuildEvidence>(),
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

/** One row per person: the target role, which shapes the default roadmap until Claude plans one, and the Claude Project. */
export const labProfile = pgTable("lab_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** The target role id. */
  direction: text("direction"),
  /** The owner's Claude Project, opened by Ask Claude. An https claude.ai link, set in Settings. */
  claudeProjectUrl: text("claude_project_url"),
  /** The Project instructions version Claude last reported through get_current_state, as YYYY-MM-DD, and when. */
  claudeInstructionsVersion: text("claude_instructions_version"),
  claudeInstructionsSeenAt: timestamp("claude_instructions_seen_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * The Claude chat a topic was learned in, pasted by the owner, so Continue chat goes straight back to it. Optional, one
 * per topic. Claude can't know its own chat's address, so it never sets this.
 */
export const labTopicChats = pgTable(
  "lab_topic_chats",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    url: text("url").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.topicId] })],
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

// Loots-wide term lookup. A saved term is one per spelling (term_key); lookups are logged only to enforce the daily limit.
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
    /** The Loots path it was found on, so the Terms page can link back. Always a same-site path. */
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

// The Claude connector's sign-in (docs/architecture/engineering-claude-connector.md, section 3). Loots is its own
// OAuth server for one owner. Codes and tokens are stored only as SHA-256 hashes.

/** An app that may ask to connect: registered through /api/oauth/register, or a client metadata URL (CIMD). */
export const oauthClients = pgTable("oauth_clients", {
  /** A random id for a registered client, or the metadata document's https URL. */
  id: text("id").primaryKey(),
  kind: text("kind").$type<"registered" | "metadata">().notNull(),
  name: text("name").notNull(),
  redirectUris: jsonb("redirect_uris").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /** For a metadata client: when its document was last read. */
  fetchedAt: timestamp("fetched_at", { withTimezone: true }),
});

/** One connection: what the owner allowed on the consent page. Disconnect revokes it and every token under it. */
export const oauthGrants = pgTable(
  "oauth_grants",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    /** When the newest refresh token expires. Past it, the connection has ended on its own. */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("oauth_grants_user_idx").on(table.userId, table.createdAt)],
);

/** Authorization codes, access tokens and refresh tokens. A code and a refresh token work once. */
export const oauthTokens = pgTable(
  "oauth_tokens",
  {
    hash: text("hash").primaryKey(),
    kind: text("kind").$type<"code" | "access" | "refresh">().notNull(),
    grantId: text("grant_id")
      .notNull()
      .references(() => oauthGrants.id, { onDelete: "cascade" }),
    /** Codes only: the exact redirect URI and PKCE challenge the code was issued for. */
    redirectUri: text("redirect_uri"),
    codeChallenge: text("code_challenge"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("oauth_tokens_grant_idx").on(table.grantId)],
);

/**
 * Notes on a topic (docs/architecture/engineering-claude-first.md, section 4). The owner adds, edits and deletes any
 * note; Claude only adds.
 */
export const labNotes = pgTable(
  "lab_notes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    author: text("author").$type<"owner" | "claude">().notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("lab_notes_user_topic_idx").on(table.userId, table.topicId, table.createdAt)],
);

/**
 * A topic's review sheet, one row per version (docs/architecture/engineering-claude-first.md, section 9h). Claude
 * replaces the sheet by saving a new version; the latest one shows, and the old ones are kept.
 */
export const labReviews = pgTable(
  "lab_reviews",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    version: integer("version").notNull(),
    sheet: jsonb("sheet").$type<ReviewSheet>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("lab_reviews_user_topic_version_unique").on(table.userId, table.topicId, table.version)],
);

/**
 * A roadmap the owner agreed to in Claude (docs/architecture/engineering-claude-first.md, section 3). One is active at a
 * time; a new one archives the old. Progress belongs to topics, so it carries across roadmaps.
 */
export const labRoadmaps = pgTable(
  "lab_roadmaps",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goal: text("goal").notNull(),
    /** Chapters in order. A chapter is one from the topic map, or one Claude added (`custom.*`). */
    chapters: jsonb("chapters").$type<{ id: string; title: string; topicIds: string[] }[]>().notNull(),
    status: text("status").$type<"active" | "archived">().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    /** When the owner last opened it; the page and Claude start from the most recent (engineering-roadmaps.md). */
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
    /** On an archived copy made by Re-plan: the roadmap it was replaced in. */
    replacedBy: text("replaced_by"),
  },
  // Up to 3 active per owner (ROADMAP_LIMIT in roadmaps.ts), enforced in code.
  (table) => [index("lab_roadmaps_user_idx").on(table.userId, table.createdAt)],
);

/** A topic Claude added to a roadmap: a title and 3 to 5 lines the owner should be able to explain. Ids are `custom.*`. */
export const labCustomTopics = pgTable(
  "lab_custom_topics",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    title: text("title").notNull(),
    lines: jsonb("lines").$type<string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.id] })],
);

/**
 * Claude's plan for a topic on one roadmap (docs/architecture/roadmap-ui.md): prerequisites and related topics on the
 * same roadmap, an estimate and a difficulty. Saved with save_topic_plan when a roadmap is planned, corrected the same way.
 */
export const labTopicPlans = pgTable(
  "lab_topic_plans",
  {
    roadmapId: text("roadmap_id")
      .notNull()
      .references(() => labRoadmaps.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    prerequisites: jsonb("prerequisites").$type<string[]>().notNull(),
    related: jsonb("related").$type<string[]>().notNull(),
    minutes: integer("minutes"),
    difficulty: text("difficulty").$type<Difficulty>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.roadmapId, table.topicId] })],
);

/**
 * Claude's material for a topic, on every roadmap (docs/architecture/roadmap-ui.md): a description, the wording of its
 * three tasks, learning resources and mastery criteria. Saved whole with save_topic_material when the topic starts.
 */
export const labTopicMaterial = pgTable(
  "lab_topic_material",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    description: text("description").notNull(),
    tasks: jsonb("tasks").$type<TopicMaterial["tasks"]>().notNull(),
    resources: jsonb("resources").$type<TopicMaterial["resources"]>().notNull(),
    criteria: jsonb("criteria").$type<string[]>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.topicId] })],
);

/** Each forwarded alert email as received, so parsing can be rerun after a parser fix. Spec: docs/product/job-finder.md. */
export const jobInboundEmails = pgTable("job_inbound_emails", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fromAddress: text("from_address").notNull(),
  source: text("source").$type<AlertSource>(),
  rawHtml: text("raw_html"),
  rawText: text("raw_text"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One row per real posting after repeats are dropped. Identity for the title+company+location fallback match
 *  ("Drop repeats") is enforced by the unique index below, not just application logic. */
export const jobPostings = pgTable(
  "job_postings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location").notNull(),
    snippet: text("snippet").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("job_postings_user_idx").on(table.userId, table.firstSeenAt),
    uniqueIndex("job_postings_user_identity_idx").on(table.userId, table.title, table.company, table.location),
  ],
);

/** Every source a posting came from (docs/product/job-finder.md, "same posting... listing every source"). The
 *  unique index is the dedup check for a posting with its own ID at the source: "has this (source, sourceId)
 *  already been seen?" */
export const jobPostingSources = pgTable(
  "job_posting_sources",
  {
    id: text("id").primaryKey(),
    postingId: text("posting_id")
      .notNull()
      .references(() => jobPostings.id, { onDelete: "cascade" }),
    source: text("source").$type<AlertSource>().notNull(),
    sourceId: text("source_id"),
    link: text("link").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("job_posting_sources_source_id_idx")
      .on(table.source, table.sourceId)
      .where(sql`${table.sourceId} is not null`),
  ],
);

/** The owner's state for one posting. One row per posting, created alongside it. */
export const jobMatches = pgTable(
  "job_matches",
  {
    postingId: text("posting_id")
      .primaryKey()
      .references(() => jobPostings.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    state: text("state").$type<JobMatchState>().notNull().default("new"),
    filterReason: text("filter_reason"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("job_matches_user_state_idx").on(table.userId, table.state)],
);

/** The step-1 preferences: skip words, skip companies, and the posted-within window. The rest of the full
 *  preferences table (pay, job type, work setup, countries, shifts, seniority, agencies, timing) is step 2/3 scope. */
export const jobPreferences = pgTable("job_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  skipWords: jsonb("skip_words").$type<string[]>().notNull().default([]),
  skipCompanies: jsonb("skip_companies").$type<string[]>().notNull().default([]),
  postedWithinDays: integer("posted_within_days").notNull().default(14),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Each scraped source's block/backoff state, one row per owner and source (docs/product/job-finder.md, "Getting
 *  postings in"). A 403 or 429 sets blockedUntil 24 hours out; a check made while it's still in the future skips
 *  the fetch and leaves the alert-email path as the only one delivering that source until it clears. */
export const jobScraperState = pgTable(
  "job_scraper_state",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    source: text("source").$type<AlertSource>().notNull(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    lastResult: text("last_result").$type<"ok" | "empty" | "blocked">(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.source] })],
);
