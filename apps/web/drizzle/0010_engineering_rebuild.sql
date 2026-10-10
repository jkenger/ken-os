CREATE TABLE "lab_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"kind" text NOT NULL,
	"prompt" text NOT NULL,
	"code" text,
	"rubric" jsonb NOT NULL,
	"reference_answer" text NOT NULL,
	"prompt_version" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_run_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"run_id" text NOT NULL,
	"question_index" integer NOT NULL,
	"answer" text NOT NULL,
	"output" jsonb,
	"self_rating" integer NOT NULL,
	"label" text,
	"rubric" jsonb,
	"feedback" text,
	"grader_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"graded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lab_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"questions" jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lab_topic_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"kind" text NOT NULL,
	"lab_id" text,
	"passed" boolean,
	"code" text,
	"results" jsonb,
	"question_id" text,
	"answer" text,
	"self_rating" integer,
	"label" text,
	"rubric" jsonb,
	"feedback" text,
	"grader_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lab_profile" ADD COLUMN "weekly_hours" integer;--> statement-breakpoint
ALTER TABLE "lab_questions" ADD CONSTRAINT "lab_questions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_run_answers" ADD CONSTRAINT "lab_run_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_run_answers" ADD CONSTRAINT "lab_run_answers_run_id_lab_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."lab_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_runs" ADD CONSTRAINT "lab_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_topic_events" ADD CONSTRAINT "lab_topic_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_topic_events" ADD CONSTRAINT "lab_topic_events_question_id_lab_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."lab_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lab_questions_user_topic_idx" ON "lab_questions" USING btree ("user_id","topic_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lab_run_answers_question_unique" ON "lab_run_answers" USING btree ("run_id","question_index");--> statement-breakpoint
CREATE INDEX "lab_runs_user_idx" ON "lab_runs" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "lab_topic_events_user_topic_idx" ON "lab_topic_events" USING btree ("user_id","topic_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lab_topic_events_review_unique" ON "lab_topic_events" USING btree ("question_id") WHERE "lab_topic_events"."kind" = 'review';--> statement-breakpoint
-- Engineering rebuild (docs/architecture/engineering-rebuild.md, section 6): start fresh. The owner's answers, attempts,
-- proofs, lessons and practice are deleted, not migrated. Source packets for kept topics and radar items stay. The
-- retired tables are emptied here and dropped in a later release.
DELETE FROM "lab_progress_changes";--> statement-breakpoint
DELETE FROM "lab_attempts";--> statement-breakpoint
DELETE FROM "lab_solution_reveals";--> statement-breakpoint
DELETE FROM "lab_chapter_screens";--> statement-breakpoint
DELETE FROM "lab_assessments";--> statement-breakpoint
DELETE FROM "lab_assessment_runs";--> statement-breakpoint
DELETE FROM "lab_daily_sets";--> statement-breakpoint
DELETE FROM "lab_progress";--> statement-breakpoint
DELETE FROM "lab_lessons";--> statement-breakpoint
DELETE FROM "lab_source_packets" WHERE "topic_id" NOT IN ('js.call_stack','js.promises','js.event_loop','js.closures','web.http_semantics','web.cookies_cors','web.http_caching','react.render_model','react.effects','react.component_boundaries','api.runtime_validation','sec.resource_authorization','api.error_contracts','db.transactions','db.composite_indexes','db.concurrency','test.strategy','sec.injection','sec.sessions','rel.background_jobs','rel.retry_backoff','rel.timeouts','rel.partial_failures','obs.logs','obs.traces','obs.metrics','arch.failure_tradeoffs','arch.service_boundaries','ai.semantic_search','ai.chunking','ai.advanced_rag','ai.retrieval_eval','ai.structured_outputs','ai.tool_calling','ai.agent_patterns','ai.agent_memory','ai.mcp','ai.evals','ai.model_routing','ai.cost_latency');--> statement-breakpoint
DELETE FROM "lab_radar_items" WHERE "topic_id" IS NOT NULL AND "topic_id" NOT IN ('js.call_stack','js.promises','js.event_loop','js.closures','web.http_semantics','web.cookies_cors','web.http_caching','react.render_model','react.effects','react.component_boundaries','api.runtime_validation','sec.resource_authorization','api.error_contracts','db.transactions','db.composite_indexes','db.concurrency','test.strategy','sec.injection','sec.sessions','rel.background_jobs','rel.retry_backoff','rel.timeouts','rel.partial_failures','obs.logs','obs.traces','obs.metrics','arch.failure_tradeoffs','arch.service_boundaries','ai.semantic_search','ai.chunking','ai.advanced_rag','ai.retrieval_eval','ai.structured_outputs','ai.tool_calling','ai.agent_patterns','ai.agent_memory','ai.mcp','ai.evals','ai.model_routing','ai.cost_latency');--> statement-breakpoint
UPDATE "lab_profile" SET "direction" = NULL, "intake" = NULL, "weekly_hours" = NULL, "conversation" = '[]'::jsonb, "added_chapters" = '[]'::jsonb, "updated_at" = now();
