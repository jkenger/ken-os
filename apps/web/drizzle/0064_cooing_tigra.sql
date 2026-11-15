ALTER TABLE "job_preferences" ADD COLUMN "digest_time" text DEFAULT '07:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_preferences" ADD COLUMN "last_digest_sent_at" timestamp with time zone;