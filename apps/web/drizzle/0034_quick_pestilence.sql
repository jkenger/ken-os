CREATE TABLE "job_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"skip_words" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skip_companies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"posted_within_days" integer DEFAULT 14 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_preferences" ADD CONSTRAINT "job_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;