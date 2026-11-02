CREATE TABLE "job_currency_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"rates" jsonb NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_preferences" DROP COLUMN "countries";