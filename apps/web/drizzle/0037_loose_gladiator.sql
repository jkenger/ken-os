ALTER TABLE "job_postings" ADD COLUMN "full_description" text;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "partial" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "pay_amount" integer;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "pay_currency" text;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "pay_period" text;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "job_type" text;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "work_setup" text;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "countries" jsonb;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "required_hours" jsonb;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "seniority" text;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "years_required" integer;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "extract_prompt_version" text;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "extract_model" text;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "processed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "job_postings_user_pending_idx" ON "job_postings" USING btree ("user_id","processed_at","first_seen_at");