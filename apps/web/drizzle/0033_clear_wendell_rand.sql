CREATE TABLE "job_inbound_emails" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"from_address" text NOT NULL,
	"source" text,
	"raw_html" text,
	"raw_text" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_matches" (
	"posting_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"state" text DEFAULT 'new' NOT NULL,
	"filter_reason" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_posting_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"posting_id" text NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"link" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_postings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text NOT NULL,
	"snippet" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_inbound_emails" ADD CONSTRAINT "job_inbound_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_posting_id_job_postings_id_fk" FOREIGN KEY ("posting_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_posting_sources" ADD CONSTRAINT "job_posting_sources_posting_id_job_postings_id_fk" FOREIGN KEY ("posting_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_matches_user_state_idx" ON "job_matches" USING btree ("user_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "job_posting_sources_source_id_idx" ON "job_posting_sources" USING btree ("source","source_id") WHERE "job_posting_sources"."source_id" is not null;--> statement-breakpoint
CREATE INDEX "job_postings_user_idx" ON "job_postings" USING btree ("user_id","first_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "job_postings_user_identity_idx" ON "job_postings" USING btree ("user_id","title","company","location");