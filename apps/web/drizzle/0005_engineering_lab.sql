CREATE TABLE "lab_assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"kind" text NOT NULL,
	"items" jsonb NOT NULL,
	"prompt_version" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"kind" text NOT NULL,
	"mode" text NOT NULL,
	"lesson_id" text,
	"assessment_id" text,
	"item_index" integer,
	"lab_id" text,
	"item" jsonb NOT NULL,
	"response" jsonb NOT NULL,
	"self_rating" integer,
	"label" text NOT NULL,
	"graded_by" text NOT NULL,
	"voided" boolean DEFAULT false NOT NULL,
	"misconceptions" jsonb NOT NULL,
	"feedback" text NOT NULL,
	"run" jsonb,
	"solution_seen" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"version" integer NOT NULL,
	"source_packet_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_progress" (
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"status" text NOT NULL,
	"progress" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_progress_user_id_topic_id_pk" PRIMARY KEY("user_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "lab_progress_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"attempt_id" text,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_solution_reveals" (
	"user_id" text NOT NULL,
	"lab_id" text NOT NULL,
	"revealed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_solution_reveals_user_id_lab_id_pk" PRIMARY KEY("user_id","lab_id")
);
--> statement-breakpoint
CREATE TABLE "lab_source_packets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"packet" jsonb NOT NULL,
	"refresh_after" text NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lab_assessments" ADD CONSTRAINT "lab_assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_attempts" ADD CONSTRAINT "lab_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_attempts" ADD CONSTRAINT "lab_attempts_lesson_id_lab_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lab_lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_attempts" ADD CONSTRAINT "lab_attempts_assessment_id_lab_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."lab_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_lessons" ADD CONSTRAINT "lab_lessons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_lessons" ADD CONSTRAINT "lab_lessons_source_packet_id_lab_source_packets_id_fk" FOREIGN KEY ("source_packet_id") REFERENCES "public"."lab_source_packets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_progress" ADD CONSTRAINT "lab_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_progress_changes" ADD CONSTRAINT "lab_progress_changes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_progress_changes" ADD CONSTRAINT "lab_progress_changes_attempt_id_lab_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."lab_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_solution_reveals" ADD CONSTRAINT "lab_solution_reveals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_source_packets" ADD CONSTRAINT "lab_source_packets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lab_assessments_user_topic_idx" ON "lab_assessments" USING btree ("user_id","topic_id","created_at");--> statement-breakpoint
CREATE INDEX "lab_attempts_user_topic_idx" ON "lab_attempts" USING btree ("user_id","topic_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lab_attempts_item_unique" ON "lab_attempts" USING btree ("assessment_id","item_index");--> statement-breakpoint
CREATE UNIQUE INDEX "lab_lessons_version_unique" ON "lab_lessons" USING btree ("user_id","topic_id","version");--> statement-breakpoint
CREATE INDEX "lab_progress_changes_user_idx" ON "lab_progress_changes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lab_source_packets_generated_unique" ON "lab_source_packets" USING btree ("user_id","topic_id","generated_at");