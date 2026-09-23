-- Baseline the three tables created by the original handwritten migration.
-- Existing installations keep their data; fresh installations create the same schema.
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "google_connections" (
  "user_id" text PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "encrypted_refresh_token" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artifact_selections" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "purpose" text NOT NULL,
  "provider" text NOT NULL,
  "external_id" text NOT NULL,
  "name" text NOT NULL,
  "mime_type" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "artifact_selections_user_id_purpose_pk" PRIMARY KEY("user_id","purpose")
);
