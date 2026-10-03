CREATE TABLE "lab_assessment_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"plan" jsonb NOT NULL,
	"generations" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lab_chapter_screens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"set_id" text NOT NULL,
	"run_id" text,
	"chapter_id" text NOT NULL,
	"item_index" integer NOT NULL,
	"item" jsonb NOT NULL,
	"prompt_version" text NOT NULL,
	"model" text NOT NULL,
	"response" jsonb,
	"self_rating" integer,
	"label" text,
	"misconceptions" jsonb,
	"feedback" text,
	"rubric" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lab_daily_sets" (
	"user_id" text NOT NULL,
	"day" text NOT NULL,
	"items" jsonb NOT NULL,
	"warm_up" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_daily_sets_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "lab_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"direction" text,
	"intake" jsonb,
	"conversation" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"added_chapters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"radar_checked_week" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_radar_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"week" text NOT NULL,
	"area" text NOT NULL,
	"tag" text NOT NULL,
	"title" text NOT NULL,
	"reason" text NOT NULL,
	"source_url" text,
	"topic_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dismissed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "lab_assessments" ADD COLUMN "origin" text DEFAULT 'topic' NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_assessments" ADD COLUMN "run_id" text;--> statement-breakpoint
ALTER TABLE "lab_assessment_runs" ADD CONSTRAINT "lab_assessment_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_chapter_screens" ADD CONSTRAINT "lab_chapter_screens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_chapter_screens" ADD CONSTRAINT "lab_chapter_screens_run_id_lab_assessment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."lab_assessment_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_daily_sets" ADD CONSTRAINT "lab_daily_sets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_profile" ADD CONSTRAINT "lab_profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_radar_items" ADD CONSTRAINT "lab_radar_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lab_assessment_runs_user_idx" ON "lab_assessment_runs" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lab_assessment_runs_one_baseline" ON "lab_assessment_runs" USING btree ("user_id") WHERE "lab_assessment_runs"."kind" = 'baseline';--> statement-breakpoint
CREATE UNIQUE INDEX "lab_chapter_screens_item_unique" ON "lab_chapter_screens" USING btree ("set_id","chapter_id","item_index");--> statement-breakpoint
CREATE INDEX "lab_chapter_screens_user_idx" ON "lab_chapter_screens" USING btree ("user_id","chapter_id");--> statement-breakpoint
CREATE INDEX "lab_radar_items_user_week_idx" ON "lab_radar_items" USING btree ("user_id","week");--> statement-breakpoint
ALTER TABLE "lab_assessments" ADD CONSTRAINT "lab_assessments_run_id_lab_assessment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."lab_assessment_runs"("id") ON DELETE cascade ON UPDATE no action;