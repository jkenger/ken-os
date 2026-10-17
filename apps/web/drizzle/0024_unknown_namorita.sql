CREATE TABLE "lab_topic_material" (
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"description" text NOT NULL,
	"tasks" jsonb NOT NULL,
	"resources" jsonb NOT NULL,
	"criteria" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_topic_material_user_id_topic_id_pk" PRIMARY KEY("user_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "lab_topic_plans" (
	"roadmap_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"prerequisites" jsonb NOT NULL,
	"related" jsonb NOT NULL,
	"minutes" integer,
	"difficulty" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_topic_plans_roadmap_id_topic_id_pk" PRIMARY KEY("roadmap_id","topic_id")
);
--> statement-breakpoint
ALTER TABLE "lab_topic_material" ADD CONSTRAINT "lab_topic_material_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_topic_plans" ADD CONSTRAINT "lab_topic_plans_roadmap_id_lab_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."lab_roadmaps"("id") ON DELETE cascade ON UPDATE no action;