ALTER TABLE "job_preferences" ADD COLUMN "pay_thresholds" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "job_preferences"
SET "pay_thresholds" = jsonb_build_array(
  jsonb_build_object('currency', "pay_currency", 'minimumPay', "minimum_pay", 'payPeriod', "pay_period")
)
WHERE "minimum_pay" IS NOT NULL;