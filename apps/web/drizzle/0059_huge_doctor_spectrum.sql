ALTER TABLE "portfolios" ADD COLUMN "slug" text;--> statement-breakpoint
CREATE UNIQUE INDEX "portfolios_slug_unique" ON "portfolios" USING btree (lower("slug"));