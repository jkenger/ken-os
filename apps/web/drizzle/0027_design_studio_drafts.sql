CREATE TABLE "design_studio_drafts" (
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"target" text NOT NULL,
	"change" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "design_studio_drafts_user_id_kind_target_pk" PRIMARY KEY("user_id","kind","target")
);
--> statement-breakpoint
ALTER TABLE "design_studio_drafts" ADD CONSTRAINT "design_studio_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;