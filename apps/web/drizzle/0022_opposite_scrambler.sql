DROP INDEX "lab_roadmaps_one_active";--> statement-breakpoint
ALTER TABLE "lab_roadmaps" ADD COLUMN "last_opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lab_roadmaps" ADD COLUMN "replaced_by" text;