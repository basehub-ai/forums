ALTER TABLE "comments" ADD COLUMN "stream_status" varchar(32) DEFAULT 'idle';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;