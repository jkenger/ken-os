ALTER TABLE "job_check_status" ADD COLUMN "first_checked_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "job_check_status" ADD COLUMN "check_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_check_status" ADD COLUMN "found" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_check_status" ADD COLUMN "last_ok_at" timestamp with time zone;