CREATE TABLE "mentions" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"target_post_id" varchar(32) NOT NULL,
	"source_post_id" varchar(32) NOT NULL,
	"source_comment_id" varchar(32) NOT NULL,
	"source_post_number" integer NOT NULL,
	"source_post_title" varchar(500),
	"source_post_owner" varchar(255) NOT NULL,
	"source_post_repo" varchar(255) NOT NULL,
	"author_id" varchar(255) NOT NULL,
	"author_username" varchar(255),
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
DROP INDEX "idx_comments_mention_source";--> statement-breakpoint
CREATE INDEX "idx_mentions_target" ON "mentions" USING btree ("target_post_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mentions_unique" ON "mentions" USING btree ("target_post_id","source_comment_id");--> statement-breakpoint
ALTER TABLE "comments" DROP COLUMN "mention_source_post_id";--> statement-breakpoint
ALTER TABLE "comments" DROP COLUMN "mention_source_comment_id";