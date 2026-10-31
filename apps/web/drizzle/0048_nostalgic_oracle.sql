ALTER TABLE "job_postings" ADD COLUMN "source_salary_min" real;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "source_salary_max" real;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "source_salary_currency" text;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "source_salary_period" text;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "source_experience_years_min" real;