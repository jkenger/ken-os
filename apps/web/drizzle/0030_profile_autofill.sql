ALTER TABLE "profile_imports" ALTER COLUMN "drive_file_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_imports" ADD COLUMN "resume_file_id" text;--> statement-breakpoint
ALTER TABLE "profile_imports" ADD CONSTRAINT "profile_imports_resume_file_id_profile_resumes_id_fk" FOREIGN KEY ("resume_file_id") REFERENCES "public"."profile_resumes"("id") ON DELETE set null ON UPDATE no action;