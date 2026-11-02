ALTER TABLE "job_postings" ADD COLUMN "source_countries" jsonb;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "source_work_mode" text;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "source_employment_type" text;