ALTER TABLE "posts" ADD COLUMN "visibility" varchar(255) DEFAULT 'public' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_posts_visibility" ON "posts" USING btree ("visibility");