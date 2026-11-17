CREATE TABLE "job_tailored_resumes" (
	"posting_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"data" "bytea" NOT NULL,
	"size" integer NOT NULL,
	"selection" jsonb NOT NULL,
	"prompt_version" text NOT NULL,
	"model" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_tailored_resumes" ADD CONSTRAINT "job_tailored_resumes_posting_id_job_postings_id_fk" FOREIGN KEY ("posting_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_tailored_resumes" ADD CONSTRAINT "job_tailored_resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;