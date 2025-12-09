CREATE TABLE "messages" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"thread_id" varchar(32) NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"owner" varchar(255) NOT NULL,
	"repo" varchar(255) NOT NULL,
	"run_id" varchar(255) NOT NULL,
	"title" varchar(500),
	"stream_id" varchar(32),
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_messages_thread_created" ON "messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_threads_owner_repo" ON "threads" USING btree ("owner","repo","id" DESC NULLS LAST);