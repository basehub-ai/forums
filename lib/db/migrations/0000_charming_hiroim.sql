CREATE TABLE "categories" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"owner" varchar(255) NOT NULL,
	"repo" varchar(255) NOT NULL,
	"title" varchar(100) NOT NULL,
	"emoji" varchar(10),
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"post_id" varchar(32) NOT NULL,
	"reply_to_id" varchar(32),
	"author_id" varchar(255) NOT NULL,
	"author_username" varchar(255),
	"seeking_answer_from" varchar(32),
	"content" jsonb NOT NULL,
	"mentions" jsonb DEFAULT '[]'::jsonb,
	"run_id" varchar(255),
	"stream_id" varchar(32),
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_users" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"image" varchar(500),
	"is_default" boolean NOT NULL,
	"is_in_model_picker" boolean NOT NULL,
	"deprecated_at" bigint,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_counters" (
	"owner" varchar(255) NOT NULL,
	"repo" varchar(255) NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "post_counters_owner_repo_pk" PRIMARY KEY("owner","repo")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"owner" varchar(255) NOT NULL,
	"repo" varchar(255) NOT NULL,
	"title" varchar(500),
	"category_id" varchar(32),
	"root_comment_id" varchar(32),
	"author_id" varchar(255) NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"comment_id" varchar(32) NOT NULL,
	"type" varchar(32) NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_categories_owner_repo_title" ON "categories" USING btree ("owner","repo","title");--> statement-breakpoint
CREATE INDEX "idx_comments_post_created" ON "comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_comments_reply_to" ON "comments" USING btree ("reply_to_id");--> statement-breakpoint
CREATE INDEX "idx_comments_author" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_comments_stream" ON "comments" USING btree ("stream_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_posts_owner_repo_number" ON "posts" USING btree ("owner","repo","number");--> statement-breakpoint
CREATE INDEX "idx_posts_owner_repo" ON "posts" USING btree ("owner","repo","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_posts_author" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reactions_unique" ON "reactions" USING btree ("user_id","comment_id","type");--> statement-breakpoint
CREATE INDEX "idx_reactions_comment" ON "reactions" USING btree ("comment_id");