CREATE TABLE "memory_receipt_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_id" text NOT NULL,
	"version" integer NOT NULL,
	"action" text NOT NULL,
	"editor" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memory_receipt_revisions" ADD CONSTRAINT "memory_receipt_revisions_receipt_id_memory_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."memory_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memory_receipt_revisions_unique" ON "memory_receipt_revisions" USING btree ("receipt_id","version");