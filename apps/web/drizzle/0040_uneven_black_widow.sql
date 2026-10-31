ALTER TABLE "job_preferences" ADD COLUMN "minimum_pay" real;--> statement-breakpoint
ALTER TABLE "job_preferences" ADD COLUMN "pay_currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_preferences" ADD COLUMN "pay_period" text DEFAULT 'month' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_preferences" ADD COLUMN "job_types" jsonb DEFAULT '["full_time","contract"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "job_preferences" ADD COLUMN "work_setups" jsonb DEFAULT '["remote"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "job_preferences" ADD COLUMN "countries" jsonb DEFAULT '["US","AU","GB"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "job_preferences" ADD COLUMN "agencies_hide" boolean DEFAULT false NOT NULL;