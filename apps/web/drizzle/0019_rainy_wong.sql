CREATE TABLE "lab_topic_chats" (
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"url" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_topic_chats_user_id_topic_id_pk" PRIMARY KEY("user_id","topic_id")
);
--> statement-breakpoint
ALTER TABLE "lab_profile" ADD COLUMN "claude_project_url" text;--> statement-breakpoint
ALTER TABLE "lab_topic_chats" ADD CONSTRAINT "lab_topic_chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;