ALTER TABLE "ken_term_lookups" ADD COLUMN "term_key" text;--> statement-breakpoint
ALTER TABLE "ken_term_lookups" ADD COLUMN "answer" jsonb;--> statement-breakpoint
CREATE INDEX "ken_term_lookups_user_key_idx" ON "ken_term_lookups" USING btree ("user_id","term_key","created_at");