CREATE TABLE "memory_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "memory_credentials_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "memory_decision_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL,
	"version" integer NOT NULL,
	"action" text NOT NULL,
	"editor" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"task_key" text,
	"idempotency_key" text NOT NULL,
	"digest" text NOT NULL,
	"title" text NOT NULL,
	"issue" text NOT NULL,
	"choice" text NOT NULL,
	"rationale" text NOT NULL,
	"alternatives" jsonb NOT NULL,
	"provenance" text NOT NULL,
	"status" text NOT NULL,
	"policy_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"kind" text NOT NULL,
	"locator" text NOT NULL,
	"relation" text NOT NULL,
	"availability" text DEFAULT 'unverified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_policies" (
	"project_id" text NOT NULL,
	"version" integer NOT NULL,
	"digest" text NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_policies_project_id_version_pk" PRIMARY KEY("project_id","version")
);
--> statement-breakpoint
CREATE TABLE "memory_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"repository" text NOT NULL,
	"sharing_mode" text NOT NULL,
	"active_policy_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"task_key" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"digest" text NOT NULL,
	"outcome" text NOT NULL,
	"verification" jsonb NOT NULL,
	"remaining" jsonb NOT NULL,
	"status" text NOT NULL,
	"policy_version" integer NOT NULL,
	"source_adapter" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "memory_credentials" ADD CONSTRAINT "memory_credentials_project_id_memory_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."memory_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_decision_revisions" ADD CONSTRAINT "memory_decision_revisions_decision_id_memory_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."memory_decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_decisions" ADD CONSTRAINT "memory_decisions_project_id_memory_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."memory_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_evidence" ADD CONSTRAINT "memory_evidence_project_id_memory_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."memory_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_policies" ADD CONSTRAINT "memory_policies_project_id_memory_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."memory_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_projects" ADD CONSTRAINT "memory_projects_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_receipts" ADD CONSTRAINT "memory_receipts_project_id_memory_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."memory_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memory_decision_revisions_unique" ON "memory_decision_revisions" USING btree ("decision_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_decisions_idempotency_unique" ON "memory_decisions" USING btree ("project_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_receipts_idempotency_unique" ON "memory_receipts" USING btree ("project_id","idempotency_key");