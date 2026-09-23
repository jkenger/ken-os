CREATE TABLE "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"files" jsonb NOT NULL,
	"digest" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "skills_owner_slug_version_unique" ON "skills" USING btree ("user_id","slug","version");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_one_enabled_version_unique" ON "skills" USING btree ("user_id","slug") WHERE "skills"."enabled" = true;