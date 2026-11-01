ALTER TABLE "job_postings" ADD COLUMN "skills" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "source_posted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "source_updated_at" timestamp with time zone;