ALTER TABLE "portfolios" ADD COLUMN "shown_roadmaps" jsonb;--> statement-breakpoint
ALTER TABLE "portfolios" ADD COLUMN "shown_explanations" jsonb DEFAULT '[]'::jsonb NOT NULL;