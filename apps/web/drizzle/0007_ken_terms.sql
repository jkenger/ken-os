CREATE TABLE "ken_term_lookups" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ken_terms" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"term" text NOT NULL,
	"term_key" text NOT NULL,
	"meaning" text NOT NULL,
	"source_title" text,
	"source_url" text,
	"found_in" text NOT NULL,
	"found_at" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ken_term_lookups" ADD CONSTRAINT "ken_term_lookups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ken_terms" ADD CONSTRAINT "ken_terms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ken_term_lookups_user_idx" ON "ken_term_lookups" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ken_terms_user_key_unique" ON "ken_terms" USING btree ("user_id","term_key");