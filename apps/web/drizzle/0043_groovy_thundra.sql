ALTER TABLE "job_postings" ADD COLUMN "eligibility_stated" boolean;--> statement-breakpoint
-- Backfill already-processed rows: a non-empty countries array could only exist if eligibility was stated under
-- the old extraction logic, so infer eligibility_stated from it. Leaves not-yet-processed rows (processed_at
-- null) as null, correctly meaning "not yet processed", never "stated nothing".
UPDATE "job_postings"
SET "eligibility_stated" = (
  "countries" IS NOT NULL AND jsonb_array_length("countries") > 0
)
WHERE "processed_at" IS NOT NULL;