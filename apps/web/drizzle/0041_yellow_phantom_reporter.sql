ALTER TABLE "job_matches" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN "score_reasons" jsonb;--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN "score_prompt_version" text;--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN "profile_version_scored" timestamp with time zone;