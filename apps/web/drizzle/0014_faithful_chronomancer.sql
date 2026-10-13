CREATE TABLE "lab_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"author" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lab_topic_events" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "lab_topic_events" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "lab_topic_events" ADD COLUMN "evidence" text;--> statement-breakpoint
ALTER TABLE "lab_topic_events" ADD COLUMN "evidence_note" text;--> statement-breakpoint
ALTER TABLE "lab_notes" ADD CONSTRAINT "lab_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lab_notes_user_topic_idx" ON "lab_notes" USING btree ("user_id","topic_id","created_at");