CREATE TABLE "lab_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"version" integer NOT NULL,
	"sheet" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lab_topic_events" ADD COLUMN "stuck" text;--> statement-breakpoint
ALTER TABLE "lab_reviews" ADD CONSTRAINT "lab_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lab_reviews_user_topic_version_unique" ON "lab_reviews" USING btree ("user_id","topic_id","version");