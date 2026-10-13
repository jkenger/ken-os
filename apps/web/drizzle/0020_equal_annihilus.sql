ALTER TABLE "lab_profile" ADD COLUMN "claude_instructions_version" text;--> statement-breakpoint
ALTER TABLE "lab_profile" ADD COLUMN "claude_instructions_seen_at" timestamp with time zone;