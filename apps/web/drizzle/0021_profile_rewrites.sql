CREATE TABLE "profile_rewrites" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_role" text DEFAULT '' NOT NULL,
	"suggestions" jsonb NOT NULL,
	"prompt_version" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_rewrites" ADD CONSTRAINT "profile_rewrites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_rewrites_user_created_idx" ON "profile_rewrites" USING btree ("user_id","created_at");