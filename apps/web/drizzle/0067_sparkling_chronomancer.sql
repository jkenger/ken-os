CREATE TABLE "job_scraper_state" (
	"source" text PRIMARY KEY NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"blocked_until" timestamp with time zone,
	"last_run_at" timestamp with time zone
);
