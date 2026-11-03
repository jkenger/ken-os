CREATE TABLE "job_check_status" (
	"user_id" text PRIMARY KEY NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"ok" boolean NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_check_status" ADD CONSTRAINT "job_check_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;