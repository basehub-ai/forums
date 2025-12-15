ALTER TABLE "comments" RENAME COLUMN "reply_to_id" TO "thread_comment_id";--> statement-breakpoint
DROP INDEX "idx_comments_reply_to";--> statement-breakpoint
CREATE INDEX "idx_comments_thread" ON "comments" USING btree ("thread_comment_id");