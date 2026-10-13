CREATE TABLE "lab_custom_topics" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"title" text NOT NULL,
	"lines" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_custom_topics_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "lab_roadmaps" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"goal" text NOT NULL,
	"chapters" jsonb NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "lab_custom_topics" ADD CONSTRAINT "lab_custom_topics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_roadmaps" ADD CONSTRAINT "lab_roadmaps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lab_roadmaps_user_idx" ON "lab_roadmaps" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lab_roadmaps_one_active" ON "lab_roadmaps" USING btree ("user_id") WHERE "lab_roadmaps"."status" = 'active';