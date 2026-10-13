ALTER TABLE "profiles" ADD COLUMN "template" text DEFAULT 'classic' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "paper" text DEFAULT 'letter' NOT NULL;