ALTER TABLE "lab_topic_events" DROP CONSTRAINT "lab_topic_events_question_id_lab_questions_id_fk";
--> statement-breakpoint
ALTER TABLE "lab_assessment_runs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_assessments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_attempts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_chapter_screens" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_daily_sets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_lessons" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_progress_changes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_questions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_radar_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_run_answers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_runs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_solution_reveals" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_source_packets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "lab_assessment_runs" CASCADE;--> statement-breakpoint
DROP TABLE "lab_assessments" CASCADE;--> statement-breakpoint
DROP TABLE "lab_attempts" CASCADE;--> statement-breakpoint
DROP TABLE "lab_chapter_screens" CASCADE;--> statement-breakpoint
DROP TABLE "lab_daily_sets" CASCADE;--> statement-breakpoint
DROP TABLE "lab_lessons" CASCADE;--> statement-breakpoint
DROP TABLE "lab_progress_changes" CASCADE;--> statement-breakpoint
DROP TABLE "lab_questions" CASCADE;--> statement-breakpoint
DROP TABLE "lab_radar_items" CASCADE;--> statement-breakpoint
DROP TABLE "lab_run_answers" CASCADE;--> statement-breakpoint
DROP TABLE "lab_runs" CASCADE;--> statement-breakpoint
DROP TABLE "lab_solution_reveals" CASCADE;--> statement-breakpoint
DROP TABLE "lab_source_packets" CASCADE;--> statement-breakpoint
ALTER TABLE "lab_profile" DROP COLUMN "intake";--> statement-breakpoint
ALTER TABLE "lab_profile" DROP COLUMN "weekly_hours";--> statement-breakpoint
ALTER TABLE "lab_profile" DROP COLUMN "conversation";--> statement-breakpoint
ALTER TABLE "lab_profile" DROP COLUMN "added_chapters";--> statement-breakpoint
ALTER TABLE "lab_profile" DROP COLUMN "radar_checked_week";