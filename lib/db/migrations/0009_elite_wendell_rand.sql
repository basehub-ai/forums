ALTER TABLE "posts" RENAME COLUMN "git_context" TO "git_contexts";--> statement-breakpoint
ALTER TABLE "llm_users" ADD COLUMN "billing_category" varchar(32) DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" DROP COLUMN "archived_at";