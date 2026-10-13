CREATE TABLE "lab_exercise_drafts" (
	"user_id" text NOT NULL,
	"lab_id" text NOT NULL,
	"code" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_exercise_drafts_user_id_lab_id_pk" PRIMARY KEY("user_id","lab_id")
);
--> statement-breakpoint
CREATE TABLE "lab_exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"version" integer NOT NULL,
	"source" text NOT NULL,
	"runner" text NOT NULL,
	"task" text NOT NULL,
	"starter" text NOT NULL,
	"tests" text NOT NULL,
	"solution" text NOT NULL,
	"setup" text DEFAULT '' NOT NULL,
	"hint" text,
	"checked" text DEFAULT 'unchecked' NOT NULL,
	"check_problem" text,
	"checked_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lab_lessons" ALTER COLUMN "source_packet_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_lessons" ADD COLUMN "source" text DEFAULT 'ken-os' NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_questions" ADD COLUMN "source" text DEFAULT 'ken-os' NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_topic_events" ADD COLUMN "source" text DEFAULT 'ken-os' NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_exercise_drafts" ADD CONSTRAINT "lab_exercise_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_exercises" ADD CONSTRAINT "lab_exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lab_exercises_version_unique" ON "lab_exercises" USING btree ("user_id","topic_id","version");