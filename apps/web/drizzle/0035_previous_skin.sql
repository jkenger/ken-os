CREATE TABLE "job_scraper_state" (
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_result" text,
	"blocked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_scraper_state_user_id_source_pk" PRIMARY KEY("user_id","source")
);
--> statement-breakpoint
ALTER TABLE "job_scraper_state" ADD CONSTRAINT "job_scraper_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;