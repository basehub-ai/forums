ALTER TABLE "comments" ADD COLUMN "mention_source_post_id" varchar(32);--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "mention_source_comment_id" varchar(32);--> statement-breakpoint
CREATE INDEX "idx_comments_mention_source" ON "comments" USING btree ("mention_source_post_id");